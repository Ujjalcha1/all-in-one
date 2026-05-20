import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join, basename, extname } from "path";
import { promisify } from "util";
import { tmpdir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Temp setup
    const tempId = crypto.randomUUID();
    const tempDir = join(tmpdir(), "word-tools");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    const fileExt = extname(file.name) || ".docx";
    const inputPath = join(tempDir, `${tempId}${fileExt}`);
    const convertedPdfPath = join(tempDir, `${tempId}.pdf`);

    await writeFile(inputPath, buffer);

    try {
      const secret = process.env.CONVERTAPI_SECRET;
      if (secret) {
        console.log("Using ConvertAPI for Word to PDF...");
        const ext = fileExt.replace(".", "").toLowerCase() || "docx";
        const response = await fetch(`https://v2.convertapi.com/convert/${ext}/to/pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${secret}`
          },
          body: JSON.stringify({
            Parameters: [
              {
                Name: "File",
                FileValue: {
                  Name: file.name,
                  Data: buffer.toString("base64")
                }
              }
            ]
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`ConvertAPI failed: ${errText}`);
        }

        const data = await response.json();
        const base64Data = data.Files[0].FileData;
        const pdfBuffer = Buffer.from(base64Data, "base64");

        // Clean up input file
        await unlink(inputPath).catch(console.error);

        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${basename(file.name, fileExt)}.pdf"`
          }
        });
      }

      let converted = false;
      const psScriptPath = join(tempDir, `${tempId}_convert.ps1`);

      if (process.platform === "win32") {
        try {
          const psScriptContent = `
$ErrorActionPreference = "Stop"
$inputPath = "${inputPath.replace(/\\/g, '\\\\')}"
$outputPath = "${convertedPdfPath.replace(/\\/g, '\\\\')}"

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0 # wdAlertsNone
    
    # Open Document
    $doc = $word.Documents.Open($inputPath, $true, $true)
    
    # Export as PDF (wdFormatPDF = 17)
    $doc.SaveAs([ref] $outputPath, [ref] 17)
    
    $doc.Close([ref] 0) # wdDoNotSaveChanges
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    if ($word) {
        try { $word.Quit() } catch {}
    }
    exit 1
}
`;
          await writeFile(psScriptPath, psScriptContent, "utf-8");
          const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
          console.log(`Attempting native Word COM conversion: ${psCommand}`);
          await execAsync(psCommand);
          if (existsSync(convertedPdfPath)) {
            console.log("Native Word COM conversion succeeded!");
            converted = true;
          }
        } catch (comError: any) {
          console.warn("Native Word COM conversion failed, falling back to LibreOffice:", comError.message || comError);
        } finally {
          await unlink(psScriptPath).catch(() => {});
        }
      }

      if (!converted) {
        console.log("Falling back to LibreOffice headless conversion...");
        // Find LibreOffice
        let sofficeCmd = "soffice";
        if (process.platform === "win32") {
          const commonPaths = [
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
          ];
          for (const cp of commonPaths) {
            if (existsSync(cp)) {
              sofficeCmd = `"${cp}"`;
              break;
            }
          }
        }

        // Convert to PDF using LibreOffice with isolated user profile and explicit Writer PDF Export filter
        const profileDir = join(tempDir, "lo-profile").replace(/\\/g, "/");
        const convertCmd = `${sofficeCmd} "-env:UserInstallation=file:///${profileDir}" --headless --convert-to pdf:writer_pdf_Export --outdir "${tempDir}" "${inputPath}"`;
        console.log(`Running LibreOffice Writer fallback: ${convertCmd}`);
        
        try {
          await execAsync(convertCmd);
        } catch (err: any) {
          console.error("LibreOffice Writer conversion failed:", err);
          throw new Error(
            "Both native Word and LibreOffice Writer conversions failed. " +
            "Error details: " + (err.message || String(err))
          );
        }
      }

      // Verify converted file exists
      if (!existsSync(convertedPdfPath)) {
        throw new Error("Failed to generate output PDF.");
      }

      // Read final PDF
      const pdfBuffer = await readFile(convertedPdfPath);

      // Clean up all temp files
      await unlink(inputPath).catch(console.error);
      await unlink(convertedPdfPath).catch(console.error);

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${basename(file.name, fileExt)}.pdf"`
        }
      });

    } catch (e: any) {
      // Clean up on error
      await unlink(inputPath).catch(() => {});
      await unlink(convertedPdfPath).catch(() => {});
      console.error("Word conversion route error:", e);
      return NextResponse.json({ 
        error: "Failed to convert Word document", 
        details: e.message || String(e),
        hint: "Ensure LibreOffice is installed at C:\\Program Files\\LibreOffice or Word is available."
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Internal API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

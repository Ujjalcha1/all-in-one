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
    const tempDir = join(tmpdir(), "spreadsheet-tools");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    const fileExt = extname(file.name) || ".xlsx";
    const inputPath = join(tempDir, `${tempId}${fileExt}`);
    const convertedPdfPath = join(tempDir, `${tempId}.pdf`);

    await writeFile(inputPath, buffer);

    try {
      let converted = false;
      const psScriptPath = join(tempDir, `${tempId}_convert.ps1`);

      if (process.platform === "win32") {
        try {
          const psScriptContent = `
$ErrorActionPreference = "Stop"
$inputPath = "${inputPath.replace(/\\/g, '\\\\')}"
$outputPath = "${convertedPdfPath.replace(/\\/g, '\\\\')}"

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # Open Workbook
    # 2nd arg: UpdateLinks = 2
    # 3rd arg: ReadOnly = True
    $workbook = $excel.Workbooks.Open($inputPath, 2, $true)
    
    # Configure Page Setup to ensure worksheets scale gracefully
    foreach ($sheet in $workbook.Worksheets) {
        $sheet.PageSetup.Orientation = 1 # xlPortrait
        $sheet.PageSetup.FitToPagesWide = 1
        $sheet.PageSetup.FitToPagesTall = 0 # automatic tall
        $sheet.PageSetup.Zoom = $false
    }
    
    # Export as PDF (xlTypePDF = 0)
    $workbook.ExportAsFixedFormat(0, $outputPath)
    
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    if ($excel) {
        try { $excel.Quit() } catch {}
    }
    exit 1
}
`;
          await writeFile(psScriptPath, psScriptContent, "utf-8");
          const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
          console.log(`Attempting native Excel COM conversion: ${psCommand}`);
          await execAsync(psCommand);
          if (existsSync(convertedPdfPath)) {
            console.log("Native Excel COM conversion succeeded!");
            converted = true;
          }
        } catch (comError: any) {
          console.warn("Native Excel COM conversion failed, falling back to LibreOffice:", comError.message || comError);
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

        // Convert to PDF using LibreOffice with isolated user profile and explicit Calc PDF Export filter
        const profileDir = join(tempDir, "lo-profile").replace(/\\/g, "/");
        const convertCmd = `${sofficeCmd} "-env:UserInstallation=file:///${profileDir}" --headless --convert-to pdf:calc_pdf_Export --outdir "${tempDir}" "${inputPath}"`;
        console.log(`Running LibreOffice Calc fallback: ${convertCmd}`);
        
        try {
          await execAsync(convertCmd);
        } catch (err: any) {
          console.error("LibreOffice Calc conversion failed:", err);
          throw new Error(
            "Both native Excel and LibreOffice Calc conversions failed. " +
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
      console.error("Excel conversion route error:", e);
      return NextResponse.json({ 
        error: "Failed to convert Excel workbook", 
        details: e.message || String(e),
        hint: "Ensure LibreOffice is installed at C:\\Program Files\\LibreOffice or Excel is available."
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Internal API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

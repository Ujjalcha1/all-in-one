import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import { tmpdir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create temp paths
    const tempId = crypto.randomUUID();
    const tempDir = join(tmpdir(), "pdf-tools");
    
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    const inputPath = join(tempDir, `${tempId}_input.pdf`);
    const outputPath = join(tempDir, `${tempId}_output.pdf`);

    await writeFile(inputPath, buffer);

    try {
      if (action === "compress") {
        const level = formData.get("level") as string;
        
        const secret = process.env.CONVERTAPI_SECRET;
        if (secret) {
          console.log("Using ConvertAPI for PDF compression...");
          let preset = "ebook"; // recommended
          if (level === "extreme") preset = "web";
          if (level === "less") preset = "printer";

          const response = await fetch("https://v2.convertapi.com/convert/pdf/to/compress", {
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
                },
                {
                  Name: "Preset",
                  Value: preset
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
          const outputBuffer = Buffer.from(base64Data, "base64");

          // Clean up input file
          await unlink(inputPath).catch(console.error);

          return new NextResponse(outputBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '')}_compressed.pdf"`
            }
          });
        }
        
        // Run Ghostscript for compression (Fallback)
        // We try 'gswin64c' first (Windows), then 'gs' (Linux/Mac)
        let gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';
        
        // If on Windows, check common installation paths in case it's not in PATH
        if (process.platform === 'win32') {
          const commonPaths = [
            'C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe',
            'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
            'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe',
            'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe'
          ];
          for (const cp of commonPaths) {
            if (existsSync(cp)) {
              gsCommand = `"${cp}"`;
              break;
            }
          }
        }
        
        // Map compression levels to Ghostscript PDFSETTINGS
        let pdfSettings = "/screen"; // default (extreme)
        if (level === "recommended") pdfSettings = "/ebook";
        if (level === "less") pdfSettings = "/printer";

        const args = [
          `-sDEVICE=pdfwrite`,
          `-dCompatibilityLevel=1.4`,
          `-dPDFSETTINGS=${pdfSettings}`,
          `-dNOPAUSE`,
          `-dQUIET`,
          `-dBATCH`,
          `-sOutputFile="${outputPath}"`,
          `"${inputPath}"`
        ];

        const cmd = `${gsCommand} ${args.join(" ")}`;
        
        console.log(`Running Ghostscript: ${cmd}`);
        
        try {
          await execAsync(cmd);
        } catch (execError: any) {
          console.error("Ghostscript execution failed:", execError);
          // Fallback if gswin64c is not found, try gs
          if (process.platform === 'win32' && execError.message.includes('not recognized')) {
            const fallbackCmd = `gs ${args.join(" ")}`;
            await execAsync(fallbackCmd);
          } else {
            throw execError;
          }
        }

        const outputBuffer = await readFile(outputPath);
        
        // Clean up
        await unlink(inputPath).catch(console.error);
        await unlink(outputPath).catch(console.error);

        return new NextResponse(outputBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '')}_compressed.pdf"`
          }
        });
      } else {
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
      }
    } catch (e: any) {
      // Clean up on error
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      console.error("PDF Processing Error:", e);
      return NextResponse.json({ 
        error: "Failed to process PDF", 
        details: e.message || String(e),
        hint: "Make sure Ghostscript is installed and in your system PATH."
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

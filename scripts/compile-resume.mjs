import { execSync } from "child_process";
import { existsSync, copyFileSync } from "fs";
import { join } from "path";

const resumeTex = "resume/resume.tex";
const outputDir = "public";
const outputPdf = join(outputDir, "resume.pdf");
const existingPdf = join(outputDir, "Akshay-Borse-Resume.pdf");

console.log("Attempting to compile LaTeX resume...");

let compiled = false;

// Try tectonic first (modern, self-installing packages)
try {
  execSync("tectonic --version", { stdio: "ignore" });
  console.log("Compiling with tectonic...");
  execSync(`tectonic -o ${outputDir} ${resumeTex}`, { stdio: "inherit" });
  compiled = true;
} catch (e) {
  // Tectonic not available
}

// Try pdflatex if tectonic is not available
if (!compiled) {
  try {
    execSync("pdflatex --version", { stdio: "ignore" });
    console.log("Compiling with pdflatex...");
    execSync(`pdflatex -output-directory=${outputDir} ${resumeTex}`, { stdio: "inherit" });
    compiled = true;
  } catch (e) {
    // pdflatex not available
  }
}

if (compiled) {
  console.log(`Successfully compiled ${resumeTex} to ${outputPdf}`);
} else {
  console.warn("\n[WARNING] No local LaTeX compiler (tectonic or pdflatex) found in PATH.");
  console.warn("To compile the resume from LaTeX source, install tectonic or pdflatex.");
  
  // As a fallback, ensure resume.pdf exists by copying the existing PDF if available
  if (existsSync(existingPdf) && !existsSync(outputPdf)) {
    console.log(`Using existing ${existingPdf} as fallback for ${outputPdf}`);
    copyFileSync(existingPdf, outputPdf);
  } else if (!existsSync(outputPdf)) {
    console.warn("No fallback PDF found. Please manually place a compiled PDF at public/resume.pdf");
  }
}

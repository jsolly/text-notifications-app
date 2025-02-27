#!/usr/bin/env node

/**
 * SVG to PNG Converter
 *
 * This script converts SVG files to PNG format using the sharp library.
 * It takes SVG files from public/assets/ and outputs PNG files to public/pngs/.
 *
 * Usage:
 *   node --loader ts-node/esm svg-to-png.ts [filename]
 *
 * If filename is provided, it will only convert that specific SVG file.
 * Otherwise, it will convert all SVG files specified in the script.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Define types
interface OutputConfig {
	name: string;
	width: number;
	height: number;
}

interface SvgFileConfig {
	input: string;
	outputs: OutputConfig[];
}

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "public", "assets");
const pngsDir = path.join(__dirname, "..", "public", "pngs");

// SVG files to convert (with their output sizes)
const svgFiles: SvgFileConfig[] = [
	{
		input: "notification-avatar.svg",
		outputs: [
			{ name: "notification-avatar.png", width: 512, height: 512 },
			{ name: "favicon.png", width: 32, height: 32 },
			{ name: "apple-touch-icon.png", width: 180, height: 180 },
		],
	},
	{
		input: "social-share.svg",
		outputs: [{ name: "social-share.png", width: 1200, height: 630 }],
	},
	{
		input: "notification-icon.svg",
		outputs: [{ name: "notification-icon.png", width: 512, height: 512 }],
	},
	{
		input: "calendar-icon.svg",
		outputs: [{ name: "calendar-icon.png", width: 512, height: 512 }],
	},
	{
		input: "message-icon.svg",
		outputs: [{ name: "message-icon.png", width: 512, height: 512 }],
	},
	{
		input: "mobile-icon.svg",
		outputs: [{ name: "mobile-icon.png", width: 512, height: 512 }],
	},
	{
		input: "shield-icon.svg",
		outputs: [{ name: "shield-icon.png", width: 512, height: 512 }],
	},
	{
		input: "star.svg",
		outputs: [{ name: "star.png", width: 512, height: 512 }],
	},
	{
		input: "chat-bubble.svg",
		outputs: [{ name: "chat-bubble.png", width: 512, height: 512 }],
	},
	{
		input: "Xlogo.svg",
		outputs: [{ name: "Xlogo.png", width: 512, height: 512 }],
	},
	{
		input: "wave-pattern.svg",
		outputs: [{ name: "wave-pattern.png", width: 1200, height: 300 }],
	},
	{
		input: "hero-pattern.svg",
		outputs: [{ name: "hero-pattern.png", width: 1200, height: 600 }],
	},
];

// Get the filename from command line arguments
const targetFile = process.argv[2];

// Function to convert SVG to PNG
async function convertSvgToPng(
	svgFile: string,
	outputFiles: OutputConfig[],
): Promise<void> {
	try {
		const svgPath = path.join(assetsDir, svgFile);
		const svgBuffer = fs.readFileSync(svgPath);

		for (const output of outputFiles) {
			const outputPath = path.join(pngsDir, output.name);

			await sharp(svgBuffer)
				.resize(output.width, output.height)
				.png()
				.toFile(outputPath);

			console.log(
				`Converted ${svgFile} to ${output.name} (${output.width}x${output.height})`,
			);
		}
	} catch (error) {
		console.error(`Error converting ${svgFile}:`, error);
	}
}

// Main function
async function main(): Promise<void> {
	// Create directories if they don't exist
	if (!fs.existsSync(assetsDir)) {
		fs.mkdirSync(assetsDir, { recursive: true });
	}

	if (!fs.existsSync(pngsDir)) {
		fs.mkdirSync(pngsDir, { recursive: true });
	}

	// If a target file is specified, only convert that file
	if (targetFile) {
		const fileConfig = svgFiles.find((file) => file.input === targetFile);
		if (fileConfig) {
			await convertSvgToPng(fileConfig.input, fileConfig.outputs);
		} else {
			console.error(`File ${targetFile} not found in configuration.`);
		}
		return;
	}

	// Otherwise, convert all files
	for (const file of svgFiles) {
		await convertSvgToPng(file.input, file.outputs);
	}
}

main().catch((error) => console.error(error));

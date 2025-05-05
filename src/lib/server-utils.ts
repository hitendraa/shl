'use server';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Generate a hash of the data file to check if it has changed
export async function generateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Store and check the data hash in a local file to avoid re-uploading unchanged data
export async function shouldUploadData(dataFilePath: string): Promise<boolean> {
  const hashFilePath = path.join(process.cwd(), 'data-hash.json');
  const currentHash = await generateFileHash(dataFilePath);
  
  try {
    let existingHash = null;
    try {
      const hashData = await fs.readFile(hashFilePath, 'utf8');
      existingHash = JSON.parse(hashData);
    } catch (error) {
      // If the hash file doesn't exist, we will create it later
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error('Error reading hash file:', error);
      }
    }
    
    if (existingHash && existingHash.hash === currentHash) {
      return false; // Data hasn't changed, don't upload
    }
    
    // Save the new hash
    await fs.writeFile(hashFilePath, JSON.stringify({ hash: currentHash }));
    return true;
  } catch (error) {
    console.error('Error checking data hash:', error);
    return true; // Upload if there's any error
  }
}

// Read data from the JSON file
export async function readJsonData<T>(filePath: string): Promise<T> {
  try {
    const rawData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(rawData) as T;
  } catch (error) {
    console.error('Error reading JSON file:', error);
    throw new Error('Failed to read JSON data');
  }
}
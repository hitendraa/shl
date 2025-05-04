'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function UploadButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUpload = async () => {
    setIsUploading(true);
    setDialogOpen(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred during upload'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleUpload} 
        disabled={isUploading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isUploading ? 'Uploading...' : 'Upload to Pinecone'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Upload Status</DialogTitle>
            <DialogDescription>
              {isUploading ? 'Uploading data to Pinecone...' : 'Status of the Pinecone data upload process'}
            </DialogDescription>
          </DialogHeader>
          
          {isUploading ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              <span className="ml-3">Processing data upload...</span>
            </div>
          ) : result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
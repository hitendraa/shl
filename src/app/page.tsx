"use client";

import { useState } from 'react';
import { SearchForm } from '@/components/search-form';
import { RecommendationsSection } from '@/components/recommendations';
import { EvaluationComponent } from '@/components/evaluation';
import Image from 'next/image';
import UploadButton from '@/components/upload-button';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle } from 'lucide-react';

interface Recommendation {
  name: string;
  description: string;
  type: string;
  duration: string;
  suitableFor: string;
  relevanceScore: number | string;
  remoteTestingAvailable: string;
  link: string;
}

export default function Home() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [conversationalResponse, setConversationalResponse] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [lastQuery, setLastQuery] = useState<string>('');
  const [showEvaluation, setShowEvaluation] = useState<boolean>(false);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(undefined);
    setLastQuery(query);
    setConversationalResponse(undefined);
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: query }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setSearchError(data.error);
        setRecommendations([]);
        setConversationalResponse(undefined);
      } 
      // Check if it's a conversational response
      else if (data.conversationalResponse) {
        setConversationalResponse(data.conversationalResponse);
        setRecommendations([]);
      } 
      // Check if it's recommendations
      else if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        // Ensure we display exactly up to 10 recommendations
        const formattedRecommendations = data.recommendations
          .slice(0, 10)
          .map((rec: Recommendation) => ({
            name: rec.name || "Unknown Assessment",
            description: rec.description || "No description available",
            type: rec.type || "Not specified",
            duration: rec.duration || "Not specified",
            suitableFor: rec.suitableFor || "All levels",
            // Ensure relevanceScore is a number between 1-100
            relevanceScore: typeof rec.relevanceScore === 'string' 
              ? parseInt(rec.relevanceScore, 10) 
              : rec.relevanceScore || 70,
            remoteTestingAvailable: rec.remoteTestingAvailable || "Yes",
            link: rec.link || "https://www.shl.com/solutions/products/product-catalog/"
          }));
          
        console.log("Successfully processed recommendations:", formattedRecommendations.length);
        setRecommendations(formattedRecommendations);
        setConversationalResponse(undefined);
      } else {
        console.error("Invalid response format:", data);
        setSearchError('No recommendations found. Try adjusting your query.');
        setRecommendations([]);
        setConversationalResponse(undefined);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchError('An error occurred while searching. Please try again.');
      setRecommendations([]);
      setConversationalResponse(undefined);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white font-bold text-2xl rounded-lg p-2 w-10 h-10 flex items-center justify-center">
              S
            </div>
            <h1 className="text-3xl font-bold">SHL Assessment Recommender</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowEvaluation(!showEvaluation)}>
              {showEvaluation ? 'Hide Evaluation' : 'Show Evaluation'}
            </Button>
            <UploadButton/>
          </div>
        </header>
        
        {showEvaluation && <EvaluationComponent />}
        
        <SearchForm onSearch={handleSearch} isSearching={isSearching} />
        
        {lastQuery && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Search query:</p>
            <p className="text-sm font-medium bg-gray-50 p-3 rounded-md border border-gray-200">
              {lastQuery}
            </p>
          </div>
        )}
        
        {/* Display conversational response if exists */}
        {conversationalResponse && (
          <Alert className="mb-6 bg-blue-50 border border-blue-200">
            <MessageCircle className="h-5 w-5 text-blue-500 mr-2" />
            <AlertDescription className="text-md">
              {conversationalResponse.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
        
        <RecommendationsSection 
          recommendations={recommendations} 
          loading={isSearching} 
          error={searchError}
        />
        
        {!isSearching && recommendations.length === 0 && !searchError && !conversationalResponse && !showEvaluation && (
          <div className="w-full flex flex-col items-center justify-center py-20 text-center">
            <Image 
              src="/globe.svg" 
              alt="Search illustration" 
              width={180} 
              height={180} 
              className="opacity-20 mb-8"
            />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Find the Perfect Assessments</h2>
            <p className="text-gray-500 max-w-lg">
              Enter your requirements above to get tailored assessment recommendations from SHL&apos;s comprehensive catalog.
            </p>
            <p className="text-gray-500 mt-2 max-w-lg">
              You can ask questions like &quot;What&apos;s the best assessment for Java developers?&quot; or provide a full job description.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

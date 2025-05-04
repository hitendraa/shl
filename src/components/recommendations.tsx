import React from 'react';
import { AssessmentCard } from '@/components/assessment-card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';

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

interface RecommendationsProps {
  recommendations: Recommendation[];
  loading: boolean;
  error?: string;
}

export function RecommendationsSection({ 
  recommendations, 
  loading, 
  error 
}: RecommendationsProps) {
  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-600">Finding the best assessments for you...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a moment while we analyze your requirements</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Alert className="mb-6 bg-amber-50 text-amber-800 border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No recommendations found</AlertTitle>
        <AlertDescription>
          Try adjusting your query to be more specific about the skills, job levels, or time constraints.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6">Recommended Assessments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recommendations.map((recommendation, index) => (
          <AssessmentCard
            key={`${recommendation.name}-${index}`}
            name={recommendation.name}
            description={recommendation.description}
            type={recommendation.type}
            duration={recommendation.duration}
            suitableFor={recommendation.suitableFor}
            relevanceScore={recommendation.relevanceScore}
            remoteTestingAvailable={recommendation.remoteTestingAvailable}
            link={recommendation.link}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
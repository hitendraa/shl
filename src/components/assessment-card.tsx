import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface AssessmentCardProps {
  name: string;
  description: string;
  type: string;
  duration: string;
  suitableFor: string;
  relevanceScore: number | string;
  remoteTestingAvailable: string;
  link: string;
  rank: number;
}

export function AssessmentCard({
  name,
  description,
  type,
  duration,
  suitableFor,
  relevanceScore,
  remoteTestingAvailable,
  link,
  rank
}: AssessmentCardProps) {
  // Convert relevanceScore to a number if it's a string
  const score = typeof relevanceScore === 'string' 
    ? parseInt(relevanceScore, 10) 
    : relevanceScore;
  
  // Get badge color based on assessment type
  const getBadgeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('knowledge')) return 'bg-blue-100 text-blue-800';
    if (lowerType.includes('ability')) return 'bg-purple-100 text-purple-800';
    if (lowerType.includes('personality')) return 'bg-green-100 text-green-800';
    if (lowerType.includes('situational')) return 'bg-amber-100 text-amber-800';
    if (lowerType.includes('simulation')) return 'bg-rose-100 text-rose-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  // Format URL for proper linking
  const getFormattedUrl = (url: string) => {
    if (!url) return 'https://www.shl.com/solutions/products/product-catalog/';
    
    // Check if URL is already formatted correctly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it contains "/products/product-catalog/view/" but not the full URL
    if (url.includes('/products/product-catalog/view/') && !url.includes('https://www.shl.com')) {
      return `https://www.shl.com${url.startsWith('/') ? url : `/${url}`}`;
    }
    
    // If it's just the assessment slug
    if (!url.includes('/')) {
      return `https://www.shl.com/solutions/products/product-catalog/view/${url}/`;
    }
    
    // Default: assume it's a relative URL and convert it
    return `https://www.shl.com${url.startsWith('/') ? '' : '/'}${url}`;
  };
  
  // Format description to limit length
  const formatDescription = (desc: string) => {
    if (!desc) return "No description available";
    if (desc.length > 180) return desc.substring(0, 177) + "...";
    return desc;
  };
  
  // Format/clean the name if needed
  const formatName = (name: string) => {
    if (!name) return "Unknown Assessment";
    // Remove any suffix like "| SHL" if present
    return name.replace(/\s*\|\s*SHL\s*$/, '');
  };

  return (
    <Card className="w-full transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{formatName(name)}</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              {formatDescription(description)}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getBadgeColor(type)}>
              {type}
            </Badge>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-semibold text-xs">Rank:</span>
              <span className="bg-gray-200 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                {rank}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{duration || "Duration not specified"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{suitableFor || "All levels"}</span>
          </div>
          <div className="flex items-center gap-2">
            {remoteTestingAvailable?.toLowerCase() === 'yes' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span>Remote testing {remoteTestingAvailable?.toLowerCase() === 'yes' ? 'available' : 'unavailable'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full bg-gray-200 h-2 rounded-full">
              <div 
                className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full"
                style={{ width: `${Math.min(Math.max(Number(score) || 0, 0), 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold">{Math.min(Math.max(Number(score) || 0, 0), 100)}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild variant="outline" className="w-full">
          <a 
            href={getFormattedUrl(link)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1"
          >
            <span>View Assessment</span>
            <ExternalLink size={14} />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
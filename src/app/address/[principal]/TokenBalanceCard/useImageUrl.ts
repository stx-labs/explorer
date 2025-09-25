'use client';

import { useQuery } from '@tanstack/react-query';

const IMAGE_CONTENT_TYPE_QUERY_KEY = 'image-content-type';
/**
 * Custom hook to fetch and determine the content type of an image URL
 *
 * This hook is used to validate image URLs from token metadata by making a HEAD request
 * to check if the URL points to a valid image resource. It's particularly useful for
 * fungible token avatars where metadata might contain broken or invalid image URLs.
 *
 * @param metadataImageUrl - Optional URL string from token metadata
 * @returns Object containing the original URL and its detected content type
 */
export function useImageContentType(metadataImageUrl?: string) {
  // Query to fetch the content-type header from the image URL
  const { data: contentType } = useQuery({
    queryKey: [IMAGE_CONTENT_TYPE_QUERY_KEY, metadataImageUrl],
    queryFn: async () => {
      try {
        if (!metadataImageUrl) return 'image';
        // Query to fetch the content-type header from the image URL
        const response = await fetch(metadataImageUrl);
        // Extract the content-type header to determine if it's a valid image
        return response.headers.get('content-type');
      } catch (error) {
        return null;
      }
    },
    enabled: !!metadataImageUrl,
    retry: false, // Don't retry failed requests (broken URLs should fail fast)
    staleTime: Infinity, // Cache the result indefinitely
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return { url: metadataImageUrl, contentType: contentType ?? 'image' };
}

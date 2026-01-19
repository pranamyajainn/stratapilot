import { AnalysisResult, CampaignStrategy } from "../types";

const API_BASE_URL = '/api';

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeCollateral = async (
  textContext: string,
  analysisLabel: string,
  mediaFile?: File,
  tokens?: { googleToken?: string, metaToken?: string, gaPropertyId?: string }
): Promise<AnalysisResult> => {
  let fileData: string | null = null;
  let mimeType: string | null = null;

  if (mediaFile) {
    fileData = await fileToGenerativePart(mediaFile);
    mimeType = mediaFile.type;
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      textContext,
      analysisLabel,
      fileData,
      mimeType,
      ...tokens,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to analyze collateral');
  }

  return result.data as AnalysisResult;
};

export const analyzeUrl = async (
  videoUrl: string,
  textContext: string,
  analysisLabel: string,
  tokens?: { googleToken?: string, metaToken?: string, gaPropertyId?: string }
): Promise<AnalysisResult> => {
  const response = await fetch(`${API_BASE_URL}/analyze-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      videoUrl,
      textContext,
      analysisLabel,
      ...tokens,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to analyze URL');
  }

  return result.data as AnalysisResult;
};

export const generateCampaignStrategy = async (
  analysis: AnalysisResult
): Promise<CampaignStrategy> => {
  const response = await fetch(`${API_BASE_URL}/strategy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ analysis }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to generate strategy');
  }

  return result.data as CampaignStrategy;
};

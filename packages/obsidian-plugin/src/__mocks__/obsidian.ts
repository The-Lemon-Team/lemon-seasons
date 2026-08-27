export interface RequestUrlParam {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
}

export interface RequestUrlResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
  json: any;
  arrayBuffer: ArrayBuffer;
}

export const requestUrl = async (params: RequestUrlParam): Promise<RequestUrlResponse> => {
  const init: RequestInit = {
    method: params.method || 'GET',
    headers: params.headers || {},
  };

  if (params.body) {
    if (typeof params.body === 'string') {
      init.body = params.body;
    } else if (params.body instanceof ArrayBuffer || params.body instanceof Uint8Array) {
      init.body = params.body;
    }
  }

  const response = await fetch(params.url, init);
  const text = await response.text();
  
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  const encoder = new TextEncoder();
  const arrayBuffer = encoder.encode(text).buffer;

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    responseHeaders[key.toLowerCase()] = val;
  });

  return {
    status: response.status,
    headers: responseHeaders,
    text,
    json,
    arrayBuffer,
  };
};

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

export class TAbstractFile {
  path: string = '';
  name: string = '';
  parent: any = null;
}

export class TFile extends TAbstractFile {
  extension: string = 'md';
  basename: string = '';
  stat: { mtime: number; ctime: number; size: number } = {
    mtime: Date.now(),
    ctime: Date.now(),
    size: 0,
  };

  constructor(path: string = '', content: string = '') {
    super();
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1] || '';
    const dotIdx = this.name.lastIndexOf('.');
    if (dotIdx !== -1) {
      this.extension = this.name.substring(dotIdx + 1);
      this.basename = this.name.substring(0, dotIdx);
    } else {
      this.basename = this.name;
      this.extension = '';
    }
    this.stat.size = content.length;
  }
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  constructor(path: string = '') {
    super();
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1] || '';
  }
}

export class Notice {
  public message: string;
  constructor(message: string, duration?: number) {
    this.message = message;
  }
}

export function normalizePath(path: string): string {
  if (!path) return '';
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
}

export class Setting {
  constructor(containerEl: any) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(cb: any) { return this; }
  addDropdown(cb: any) { return this; }
  addToggle(cb: any) { return this; }
  addButton(cb: any) { return this; }
}

export class Modal {
  app: any;
  contentEl: any = { empty: () => {}, createEl: () => ({ addClass: () => {}, setText: () => {} }) };
  constructor(app: any) { this.app = app; }
  open() {}
  close() {}
}

export function buildCdnDownloadUrl(encryptedQueryParam: string): string {
  return `https://cdn.wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmedia?${encryptedQueryParam}`;
}

import homePage from '../index.html?raw';

export const dynamic = 'force-static';

export function GET() {
  return new Response(homePage, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}

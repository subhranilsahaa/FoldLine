import { prerender } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export { ALL_PATHS, SITE_URL, SITE_URL_IS_DEFAULT, OG_IMAGE, PAGES, TOOL_COPY, headFor, structuredData } from './content';
export { META } from './tools-meta';

/** Renders one route to an HTML string, waiting for lazy tool chunks. */
export async function render(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
  return new Response(prelude).text();
}

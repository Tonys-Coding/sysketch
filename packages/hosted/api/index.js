// Vercel function: every route except the static landing page is rewritten here (vercel.json).
// `npm run build` (vercel.json buildCommand) compiles ../dist first.
import { fromRewrite, handle } from '../dist/app.js';

const run = async (request) => handle(await fromRewrite(request));

export const GET = run;
export const POST = run;
export const OPTIONS = run;
export const DELETE = run;

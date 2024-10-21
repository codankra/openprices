import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./tailwind.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="image"
          content="https://cdn.openpricedata.com/opengraph.png"
        />
        <meta
          name="og:image"
          content="https://cdn.openpricedata.com/opengraph.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://cdn.openpricedata.com/opengraph.png"
        />
        <meta property="twitter:domain" content="" />
        <meta property="twitter:url" content="https://openpricedata.com" />
        <meta
          name="twitter:title"
          content="Open Price Data | Crowdsourced History of Real Consumer Prices"
        />
        <meta
          name="twitter:description"
          content="Track true crowdsourced prices on the Open Price Data platform. See how everyday costs really change over time."
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

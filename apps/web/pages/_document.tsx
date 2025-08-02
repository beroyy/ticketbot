import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" />
        <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.discordapp.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.discordapp.com" />
        <link rel="dns-prefetch" href="https://media.tenor.com" />
        <link rel="dns-prefetch" href="https://media.giphy.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

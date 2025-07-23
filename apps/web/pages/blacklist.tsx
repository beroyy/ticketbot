export default function BlacklistPage() {
  return <h1>Blacklist</h1>;
}

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}

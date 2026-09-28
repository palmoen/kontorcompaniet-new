import { SimplePage, simpleMetadata } from "@/components/SimplePage";

export const generateMetadata = () => simpleMetadata("brukt");

export default function Page() {
  return <SimplePage slug="brukt" />;
}

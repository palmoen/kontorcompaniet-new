import { SimplePage, simpleMetadata } from "@/components/SimplePage";

export const generateMetadata = () => simpleMetadata("salgsbetingelser");

export default function Page() {
  return <SimplePage slug="salgsbetingelser" withLead={false} />;
}

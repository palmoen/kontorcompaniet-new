import { SimplePage, simpleMetadata } from "@/components/SimplePage";

export const generateMetadata = () => simpleMetadata("informasjonskapsler");

export default function Page() {
  return <SimplePage slug="informasjonskapsler" withLead={false} />;
}

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
}

export default function PlaceholderTab({ label }: Props) {
  return (
    <Card>
      <CardContent className="p-12 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {label.replace(/\n/g, " ")} — bu bölüm yakında eklenecektir.
        </p>
      </CardContent>
    </Card>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
}

export default function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-brand">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}




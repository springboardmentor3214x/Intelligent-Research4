import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

export default function CommercialChart({ data }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-xl font-bold mb-3">Commercial Viability</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="technology" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="score" fill="#16A34A" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
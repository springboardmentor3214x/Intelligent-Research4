export default function KPICard({title,value,color}){

    return(
        <div className={`rounded-xl shadow-lg p-5 text-white ${color}`}>
            <h3>{title}</h3>
            <h1 className="text-3xl font-bold">{value}</h1>
        </div>
    )
}

{/* Growth Chart */}
<div className="mt-8">
  <GrowthChart data={dashboard.adoption_trend} />
</div>

{/* Commercial Viability Chart */}
<div className="mt-8">
  <CommercialChart data={dashboard.commercial_viability} />
</div>
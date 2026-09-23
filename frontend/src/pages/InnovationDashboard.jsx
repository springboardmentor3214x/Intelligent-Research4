import {useEffect,useState} from "react";
import api from "../services/api";
import KPICard from "../components/KPICard";
import GrowthChart from "../components/GrowthChart";
import CommercialChart from "../components/CommercialChart";

export default function InnovationDashboard(){

    const [dashboard,setDashboard] = useState(null);

    useEffect(()=>{
        api.get("/innovation/dashboard")
        .then((res)=>setDashboard(res.data))
    },[])

    if(!dashboard) return <h2>Loading Dashboard...</h2>

    return(
        <div className="p-6">

            <h1 className="text-4xl font-bold mb-6">
                Technology Intelligence Dashboard
            </h1>

            <div className="grid grid-cols-4 gap-5">

                <KPICard
                    title="Emerging Technologies"
                    value={dashboard.summary.emerging_technologies}
                    color="bg-blue-600"
                />

                <KPICard
                    title="Innovation Opportunities"
                    value={dashboard.summary.innovation_opportunities}
                    color="bg-green-600"
                />

                <KPICard
                    title="Competitors"
                    value={dashboard.summary.active_competitors}
                    color="bg-purple-600"
                />

                <KPICard
                    title="Funding Projects"
                    value={dashboard.summary.funding_projects}
                    color="bg-orange-600"
                />

            </div>

        </div>
    )
}
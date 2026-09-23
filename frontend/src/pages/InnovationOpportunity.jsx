import {useState,useEffect} from "react";
import api from "../services/api";

export default function InnovationOpportunity(){

const [opportunities,setOpportunities]=useState([]);

useEffect(()=>{
api.get("/innovation/opportunities")
.then((res)=>setOpportunities(res.data))
},[]);

return(

<div className="p-6">

<h1 className="text-3xl font-bold mb-5">
Innovation Opportunities
</h1>

<table className="table-auto border w-full">

<thead className="bg-gray-100">

<tr>

<th>Technology</th>

<th>Domain</th>

<th>Opportunity</th>

<th>Funding</th>

<th>Commercial</th>

</tr>

</thead>

<tbody>

{opportunities.map((item,index)=>(

<tr key={index}>

<td>{item.technology}</td>

<td>{item.domain}</td>

<td>{item.opportunity}</td>

<td>{item.funding}</td>

<td>{item.commercial}</td>

</tr>

))}

</tbody>

</table>

</div>

)

}
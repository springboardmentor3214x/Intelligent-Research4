export default function TechnologyComparison(){

const technologies=[
{
technology:"Quantum AI",
maturity:"Developing",
adoption:"Low",
innovationScore:92
},

{
technology:"Generative AI",
maturity:"Mature",
adoption:"High",
innovationScore:96
},

{
technology:"Edge AI",
maturity:"Developing",
adoption:"Medium",
innovationScore:88
}

]

return(

<div className="p-5">

<h1 className="text-3xl font-bold mb-5">
Technology Comparison
</h1>

<table className="table-auto border w-full">

<thead>

<tr>

<th>Technology</th>

<th>Maturity</th>

<th>Adoption</th>

<th>Innovation Score</th>

</tr>

</thead>

<tbody>

{technologies.map((tech,index)=>(

<tr key={index}>

<td>{tech.technology}</td>

<td>{tech.maturity}</td>

<td>{tech.adoption}</td>

<td>{tech.innovationScore}</td>

</tr>

))}

</tbody>

</table>

</div>

)

}
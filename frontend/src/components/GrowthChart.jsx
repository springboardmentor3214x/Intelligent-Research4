import {
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
CartesianGrid
} from "recharts";

export default function GrowthChart({data}){

return(

<LineChart width={650} height={300} data={data}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="year"/>

<YAxis/>

<Tooltip/>

<Line type="monotone" dataKey="count"/>

</LineChart>

)

}
//idea for calendar page

// import { Button } from "@/components/ui/button";

// const CalendarPage = () => {
//   return (
//     <div className="max-w-3xl mx-auto">
//       <h1 className="text-4xl font-bold mb-8 text-center">Calendar</h1>
      
//       <div className="bg-gray-100 p-6 rounded-lg mb-8">
//         <h2 className="text-xl font-semibold mb-4">Weather Forecast</h2>
//         <div className="grid grid-cols-5 gap-4">
//           {Array.from({ length: 5 }).map((_, index) => (
//             <div key={index} className="bg-white p-3 rounded-md text-center">
//               <div className="text-sm text-gray-500">{getDay(index)}</div>
//               <div className="text-2xl my-2">☀️</div>
//               <div className="font-medium">72°F</div>
//             </div>
//           ))}
//         </div>
//       </div>
      
//       <h2 className="text-2xl font-semibold mb-4">Planned Outfits</h2>
      
//       <div className="space-y-4">
//         {Array.from({ length: 3 }).map((_, index) => (
//           <div key={index} className="border rounded-lg p-4">
//             <div className="flex justify-between items-center mb-3">
//               <h3 className="font-medium">{getDay(index)}</h3>
//               <Button variant="outline" size="sm">Edit</Button>
//             </div>
            
//             <div className="flex space-x-3">
//               <div className="clothing-item w-24 h-24"></div>
//               <div className="clothing-item w-24 h-24"></div>
//               <div className="clothing-item w-24 h-24"></div>
//             </div>
//           </div>
//         ))}
//       </div>
      
//       <Button className="bg-teal-500 hover:bg-teal-600 mt-6">
//         Plan New Outfit
//       </Button>
//     </div>
//   );
// };

// const getDay = (offset: number) => {
//   const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//   const date = new Date();
//   date.setDate(date.getDate() + offset);
//   return days[date.getDay()];
// };

// export default CalendarPage;
//DO

// import { useState } from "react";
// import { Heart, Search, X } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import ClosetTabs from "../components/ClosetTabs";
// import { cn } from "@/lib/utils";

// // Mock data
// const categories = ["Category", "Category", "Category", "Category", "Category"];

// const mockItems = Array.from({ length: 8 }, (_, i) => ({
//   id: i + 1,
//   name: `Item`,
//   favorite: false,
// }));

// const ClosetPage = () => {
//   const [items, setItems] = useState(mockItems);
//   const [activeTab, setActiveTab] = useState("items");
  
//   const toggleFavorite = (id: number) => {
//     setItems(items.map(item => 
//       item.id === id ? { ...item, favorite: !item.favorite } : item
//     ));
//   };

//   return (
//     <div>
//       <h1 className="text-4xl font-bold mb-8 text-center">My Closet</h1>
      
//       <div className="flex flex-wrap gap-2 mb-6">
//         {categories.map((category, index) => (
//           <button key={index} className="category-button">
//             {category}
//           </button>
//         ))}
//       </div>
      
//       <div className="relative mb-8">
//         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
//         <Input 
//           className="pl-10 bg-gray-200 border-none" 
//           placeholder="Search items..."
//         />
//       </div>
      
//       <ClosetTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
//         {items.map((item) => (
//           <div key={item.id} className="flex flex-col">
//             <div className="clothing-item">
//               <button className="item-remove">
//                 <X className="h-4 w-4" />
//               </button>
//             </div>
//             <div className="flex items-center justify-between mt-2">
//               <span>{item.name}</span>
//               <button 
//                 onClick={() => toggleFavorite(item.id)}
//                 className="focus:outline-none"
//               >
//                 <Heart 
//                   className={cn(
//                     "h-5 w-5 transition-colors", 
//                     item.favorite ? "fill-red-500 text-red-500" : "text-gray-400"
//                   )} 
//                 />
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ClosetPage;
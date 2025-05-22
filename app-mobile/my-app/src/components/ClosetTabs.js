// import { cn } from "@/lib/utils";

// interface ClosetTabsProps {
//   activeTab: string;
//   onTabChange: (tab: string) => void;
// }

// const ClosetTabs = ({ activeTab, onTabChange }: ClosetTabsProps) => {
//   return (
//     <div className="border-b border-gray-200">
//       <div className="flex justify-center space-x-4">
//         <button
//           className={cn(
//             "tab-button",
//             activeTab === "items" && "active"
//           )}
//           onClick={() => onTabChange("items")}
//         >
//           items
//         </button>
//         <button
//           className={cn(
//             "tab-button",
//             activeTab === "outfits" && "active"
//           )}
//           onClick={() => onTabChange("outfits")}
//         >
//           outfits
//         </button>
//         <button
//           className={cn(
//             "tab-button",
//             activeTab === "favourites" && "active"
//           )}
//           onClick={() => onTabChange("favourites")}
//         >
//           favourites
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ClosetTabs;
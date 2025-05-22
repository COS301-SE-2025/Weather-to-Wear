// import { NavLink } from "react-router-dom";
// import { Plus } from "lucide-react";
// import { Button } from "@/components/ui/button";

// const Navbar = () => {
//   return (
//     <nav className="bg-black py-3">
//       <div className="container mx-auto flex justify-center space-x-2">
//         <NavLink 
//           to="/" 
//           className={({isActive}) => 
//             `nav-link ${isActive ? 'active' : ''}`
//           }
//           end
//         >
//           home
//         </NavLink>
        
//         <NavLink 
//           to="/closet" 
//           className={({isActive}) => 
//             `nav-link ${isActive ? 'active' : ''} bg-teal-500`
//           }
//         >
//           closet
//         </NavLink>
        
//         <Button 
//           size="icon" 
//           className="rounded-full bg-teal-500 hover:bg-teal-600"
//         >
//           <Plus className="h-5 w-5" />
//         </Button>
        
//         <NavLink 
//           to="/calendar" 
//           className={({isActive}) => 
//             `nav-link ${isActive ? 'active' : ''}`
//           }
//         >
//           calendar
//         </NavLink>
        
//         <NavLink 
//           to="/feed" 
//           className={({isActive}) => 
//             `nav-link ${isActive ? 'active' : ''}`
//           }
//         >
//           feed
//         </NavLink>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;
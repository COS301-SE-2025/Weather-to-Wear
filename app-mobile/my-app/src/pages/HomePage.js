
import { Button } from "@/components/ui/button";

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-3xl font-bold mb-8">Welcome to Weather2Wear</h2>
      
      <div className="max-w-md text-center mb-10">
        <p className="text-lg mb-6">
          Your personal weather-based clothing assistant. Organize your wardrobe and get outfit recommendations based on the forecast.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Button 
            className="bg-black text-white hover:bg-gray-800"
            size="lg"
          >
            Today's Weather
          </Button>
          <Button 
            className="bg-teal-500 hover:bg-teal-600"
            size="lg"
          >
            Add Items
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mt-8 w-full max-w-xl">
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <h3 className="font-semibold text-xl mb-2">My Items</h3>
          <p className="text-gray-600 mb-4">Browse and manage your wardrobe items</p>
          <Button
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
            asChild
          >
            <a href="/closet">View Closet</a>
          </Button>
        </div>
        
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <h3 className="font-semibold text-xl mb-2">My Outfits</h3>
          <p className="text-gray-600 mb-4">View and create outfit combinations</p>
          <Button
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            Create Outfit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
interface ClosetTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ClosetTabs = ({ activeTab, onTabChange }: ClosetTabsProps) => {
  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex justify-center space-x-8">
        <button
          className={`pb-2 text-gray-700 font-medium ${
            activeTab === "items" ? "border-b-2 border-teal-500" : ""
          }`}
          onClick={() => onTabChange("items")}
        >
          items
        </button>
        <button
          className={`pb-2 text-gray-700 font-medium ${
            activeTab === "outfits" ? "border-b-2 border-teal-500" : ""
          }`}
          onClick={() => onTabChange("outfits")}
        >
          outfits
        </button>
        <button
          className={`pb-2 text-gray-700 font-medium ${
            activeTab === "favourites" ? "border-b-2 border-teal-500" : ""
          }`}
          onClick={() => onTabChange("favourites")}
        >
          favourites
        </button>
      </div>
    </div>
  );
};

export default ClosetTabs;
export {};
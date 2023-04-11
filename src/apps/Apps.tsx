import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { websiteName } from "App";
import Header from "./components/Header";
import AppTile from "./components/AppTile";
import { sortDAppsArray, dAppsURL } from "shared/utils/commons";
import React from "react";
import { APIContext } from "shared/context/APIContext";

function Apps() {
  const {
    dappsData,
    setDappsData,
    dappsDataSorted,
    setDappsDataSorted,
    tags,
    setTags,
  } = useContext(APIContext);

  // Filter + Search
  const [tagsToBeFilteredBy, setTagsToBeFilteredBy] = useState<string[]>([]);
  function isTagInFilterList(tag: string) {
    return tagsToBeFilteredBy.find((e) => e === tag);
  }

  function toggleTagFilter(tagName: string) {
    if (tagsToBeFilteredBy.includes(tagName)) {
      setTagsToBeFilteredBy(
        tagsToBeFilteredBy.filter((tag) => tag !== tagName)
      );
    } else {
      setTagsToBeFilteredBy(tagsToBeFilteredBy.concat(tagName));
    }
  }

  class Tag extends React.Component<{ name: string }> {
    render() {
      return (
        <button
          onClick={() => toggleTagFilter(this.props.name)}
          className={
            "inline-block text-sm px-1.5 py-0.5 rounded-md overflow-hidden transition-colors" +
            (isTagInFilterList(this.props.name)
              ? "  text-white dark:text-white font-semibold bg-gradient-to-br from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
              : " bg-white dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-medium")
          }
        >
          {this.props.name}
        </button>
      );
    }
  }

  // Search
  const [searchText, setSearchText] = useState<string>("");

  // results apps that match on the search input and chosen tags
  function filteredDappsData() {
    let items = dappsDataSorted;
    if (searchText !== "") {
      items = items.filter((app: any) =>
        app.attributes.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (tagsToBeFilteredBy?.length > 0) {
      items = items.filter((item: any) =>
        item.attributes.type
          .map((item: any) => item.name)
          .find((tag: any) => tagsToBeFilteredBy.includes(tag))
      );
    }

    return items;
  }

  return (
    <>
      <Helmet>
        <title>{websiteName} | Apps</title>
      </Helmet>
      <div className="max-w-screen-2xl mx-auto px-6 pt-6 sm:pt-0">
        <Header
          title="Apps"
          description="A curation of applications running on Terp Network Mainnet!"
        />

        {/* Search */}
        <div className="relative w-full sm:w-96 mx-auto mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="" />
          </div>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            type="text"
            id="search"
            className="block w-full p-4 pl-10 text-sm rounded-lg text-neutral-800 dark:text-white bg-white dark:bg-neutral-800 placeholder-neutral-600 dark:placeholder-neutral-400 border border-neutral-300 dark:border-neutral-700"
            placeholder="Search"
          />
        </div>
        {/* Tag-Filter */}
        <div className="mb-4 sm:mb-8 flex gap-2 flex-wrap justify-center">
          {tags?.length > 0 &&
            tags.map((tag: any) => <Tag key={tag} name={tag} />)}
          {tags?.length == 0 && <div className="h-6"></div>}
        </div>
        {/* App-Items */}
        <div className="grid grid-cols-12 gap-4 auto-rows-auto">
          {dappsData?.length > 0 && (
            <>
              {filteredDappsData().map((dapp: any) => (
                <AppTile
                  key={dapp.attributes.name}
                  name={dapp.attributes.name}
                  description={dapp.attributes.description}
                  tags={dapp.attributes.type.map((item: any) => item.name)}
                  image={dapp.attributes.logo.data.attributes.url}
                  url={dapp.attributes.link}
                />
              ))}
            </>
          )}

          {dappsData?.length <= 0 && (
            <>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
              {/* Skeleton Loader Item */}
              <div className="animate-pulse col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 2xl:col-span-3">
                <div className="h-72 bg-white dark:bg-neutral-800 rounded-xl"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Apps;

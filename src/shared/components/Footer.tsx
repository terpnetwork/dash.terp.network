import {
  faDiscord,
  faGithub,
  faInstagram,
  faTelegram,
  faTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { faComments } from "@fortawesome/free-regular-svg-icons";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

class Footer extends React.Component {
  render() {
    return (
      <>
        <div className="grid grid-cols-12 items-center px-6 py-8 mt-12 text-center gap-4">
          <div className="col-span-12 text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            {"⚡️ Powered by "}
            <a
              href="https://terp.network/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white font-bold"
            >
              Terp Network
            </a>
            <a
              href="https://scrt.network/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white font-bold"
            >
              , Secret Network
            </a>
            <a
              href="https://akash.network/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white font-bold"
            >
              , & Akash Network
            </a>
          </div>
          <div className="col-span-12 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {"Developed by "}
            <a
              href="https://secretjupiter.com/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white"
            >
              Secret Jupiter
            </a>
            {", "}
            <a
              href="https://secretsaturn.net/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white"
            >
              Secret Saturn
            </a>
            {", "}
            <a
              href="https://permissionless.terp.network/"
              target="_blank"
              className="transition-colors hover:text-black dark:hover:text-white"
            >
              The Permissionless Web Team
            </a>
          </div>
          <div className="col-span-12 space-x-4 text-xl text-center">
            <a
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              href="https://forum.terp.network/"
              target="_blank"
            >
              <FontAwesomeIcon icon={faComments} />
            </a>
            <a
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              href="https://github.com/terpnetwork"
              target="_blank"
            >
              <FontAwesomeIcon icon={faGithub} />
            </a>
            <a
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              href="https://discord.gg/9mFZc4XEDA"
              target="_blank"
            >
              <FontAwesomeIcon icon={faDiscord} />
            </a>
            <a
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              href="https://t.me/+FuFi63JcwuEzNmVh"
              target="_blank"
            >
              <FontAwesomeIcon icon={faTelegram} />
            </a>
            <a
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              href="https://twitter.com/terpculture"
              target="_blank"
            >
              <FontAwesomeIcon icon={faTwitter} />
            </a>
          </div>
        </div>
      </>
    );
  }
}

export default Footer;

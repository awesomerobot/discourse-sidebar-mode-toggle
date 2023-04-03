import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import getURL from "discourse-common/lib/get-url";
import { tracked } from "@glimmer/tracking";

export default class SidebarModeToggle extends Component {
  @service currentUser;
  @service chatStateManager;
  @service site;
  @service router;
  @service chat;
  @tracked currentMode;

  constructor() {
    super(...arguments);
    this.setDefaultMode();
    this.router.on("routeWillChange", (transition) => {
      this.updateModeBasedOnRoute(transition.to);
    });
  }

  get currentUserInDnD() {
    return this.currentUser.isInDoNotDisturb();
  }

  get href() {
    if (this.chatStateManager.isFullPageActive) {
      if (this.site.mobileView) {
        return getURL("/chat");
      } else {
        return getURL(this.router.currentURL);
      }
    }

    if (this.chatStateManager.isDrawerActive) {
      return getURL("/chat");
    }

    return getURL(this.chatStateManager.lastKnownChatURL || "/chat");
  }

  updateModeBasedOnRoute(routeName) {
    if (routeName.name.startsWith("chat.")) {
      this.setChatMode();
    } else {
      this.setForumMode();
    }
  }

  setChatMode() {
    const sidebarWrapper = document.querySelector(".sidebar-wrapper");
    sidebarWrapper.classList.add("chat-mode");
    sidebarWrapper.classList.remove("forum-mode");
    this.currentMode = "chat";
  }

  setForumMode() {
    const sidebarWrapper = document.querySelector(".sidebar-wrapper");
    sidebarWrapper.classList.add("forum-mode");
    sidebarWrapper.classList.remove("chat-mode");
    this.currentMode = "forum";
  }

  @action
  setDefaultMode() {
    const savedMode = localStorage.getItem("lastMode");
    const currentRoute = this.router.currentURL;
    let defaultMode;

    if (currentRoute.startsWith("/chat/")) {
      defaultMode = "chat";
    } else {
      defaultMode = savedMode || "forum";
    }

    if (defaultMode === "chat") {
      this.setChatMode();
      this.openInFullPage();
    } else {
      this.setForumMode();
    }
  }

  @action
  openInFullPage() {
    this.chatStateManager.storeAppURL();
    this.chatStateManager.prefersFullPage();
    this.chat.activeChannel = null;

    return this.router.transitionTo(this.chatStateManager.lastKnownChatURL);
  }

  @action
  toggleMode(event) {
    const clickedMode = event.target.closest("a").dataset.sidebarMode;
    if (clickedMode === this.currentMode) {
      return;
    }

    const sidebarWrapper = document.querySelector(".sidebar-wrapper");

    if (this.currentMode === "chat") {
      sidebarWrapper.classList.remove("chat-mode");
      sidebarWrapper.classList.add("forum-mode");
      localStorage.setItem("lastMode", "forum");
      this.currentMode = "forum";
      this.router.transitionTo(this.chatStateManager.lastKnownAppURL);
    } else if (this.currentMode === "forum") {
      sidebarWrapper.classList.remove("forum-mode");
      sidebarWrapper.classList.add("chat-mode");
      localStorage.setItem("lastMode", "chat");
      this.currentMode = "chat";
      this.openInFullPage();
    }
  }
}

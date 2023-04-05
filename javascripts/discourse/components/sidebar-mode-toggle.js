import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import getURL from "discourse-common/lib/get-url";
import { tracked } from "@glimmer/tracking";
import { next } from "@ember/runloop";

export default class SidebarModeToggle extends Component {
  @service currentUser;
  @service chatStateManager;
  @service site;
  @service router;
  @service chat;
  @service topicTrackingState;

  @tracked unreadTopicCount;
  @tracked currentMode;

  constructor() {
    super(...arguments);
    this.setDefaultMode();
    this.router.on("routeWillChange", (transition) => {
      this.updateModeBasedOnRoute(transition.to);
    });

    this.callbackId = this.topicTrackingState.onStateChange(() => {
      this.updateUnreadTopicCount();
    });
  }

  willDestroy() {
    this.topicTrackingState.offStateChange(this.callbackId);
  }

  get currentUserInDnD() {
    return this.currentUser.isInDoNotDisturb();
  }

  @action
  updateUnreadTopicCount() {
    return (this.unreadTopicCount = this.topicTrackingState.countUnread());
  }

  get href() {
    const chatURL = getURL(this.chatStateManager.lastKnownChatURL || "/chat");
    return this.chatStateManager.isFullPageActive ||
      this.chatStateManager.isDrawerActive
      ? chatURL
      : getURL(this.router.currentURL);
  }

  updateModeBasedOnRoute(routeName) {
    return routeName.name.startsWith("chat.");
  }

  updateSidebarWrapper(newMode) {
    const sidebarWrapper = document.querySelector(".sidebar-wrapper");
    sidebarWrapper.classList.remove(this.currentMode + "-mode");
    sidebarWrapper.classList.add(newMode + "-mode");
    next(() => {
      this.currentMode = newMode;
    });
  }

  @action
  setDefaultMode() {
    const savedMode = localStorage.getItem("lastMode") || "forum";
    const isChatRoute = this.router.currentURL.startsWith("/chat/");
    const defaultMode = isChatRoute ? "chat" : savedMode;
    this.updateSidebarWrapper(defaultMode);
    if (defaultMode === "chat") {
      this.openInFullPage();
    }
  }

  @action
  openInFullPage() {
    this.chatStateManager.storeAppURL();
    this.chatStateManager.prefersFullPage();
    next(() => {
      return this.router.transitionTo(this.chatStateManager.lastKnownChatURL);
    });
  }

  @action
  toggleMode() {
    if (this.currentMode === "chat") {
      this.updateSidebarWrapper("forum");
      localStorage.setItem("lastMode", "forum");
      this.router.transitionTo(
        this.chatStateManager.lastKnownAppURL.includes("/chat/")
          ? "/latest"
          : this.chatStateManager.lastKnownAppURL
      );
    } else {
      this.updateSidebarWrapper("chat");
      localStorage.setItem("lastMode", "chat");
      this.openInFullPage();
    }
  }
}

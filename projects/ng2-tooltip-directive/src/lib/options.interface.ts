import { Placement } from "./placement.type";
import { ContentType } from "./base-tooltip.directive";

export interface TooltipOptions {
    id?: string | number;
    placement?: Placement;
    autoPlacement?: boolean;
    contentType?: ContentType;
    showDelay?: number;
    hideDelay?: number;
    hideDelayTouchscreen?: number;
    zIndex?: number;
    animationDuration?: number;
    animationDurationDefault?: number;
    trigger?: "hover" | "click";
    tooltipClass?: string;
    display?: boolean;
    displayMobile?: boolean;
    displayTouchscreen?: boolean;
    shadow?: boolean;
    theme?: "dark" | "light" | "white-blue";
    offset?: number;
    width?: string;
    maxWidth?: string;
    hideDelayAfterClick?: number;
    pointerEvents?: "auto" | "none";
    position?: {top: number, left: number};
}
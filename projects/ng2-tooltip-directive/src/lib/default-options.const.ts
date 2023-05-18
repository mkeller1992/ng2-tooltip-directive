import { TooltipOptions } from "./options.interface";

export const defaultOptions: TooltipOptions = {
	id: 0,
	placement: 'top',
	autoPlacement: true,
	contentType: 'string',
	showDelay: 0,
	hideDelay: 300,
	hideDelayTouchscreen: 0,
	hideDelayAfterClick: undefined,
	zIndex: 0,
	animationDuration: 300,
	animationDurationDefault: 300,
	trigger: 'hover',
	tooltipClass: '',
	display: true,
	displayMobile: true,
	displayTouchscreen: true,
	shadow: true,
	theme: 'white-blue',
	offset: 8,
	maxWidth: '200px',
	pointerEvents: 'auto', // 'none' would mean that there is no reaction to clicks
}
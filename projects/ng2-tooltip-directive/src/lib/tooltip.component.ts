import { Component, ElementRef, EventEmitter, HostBinding, OnDestroy, OnInit, Renderer2, TemplateRef } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { filter, fromEvent, Subject, takeUntil, tap } from 'rxjs';
import { defaultOptions } from './default-options.const';
import { TooltipDto } from './tooltip.dto';
import { TooltipOptions } from './options.interface';
import { Placement } from './placement.type';
import { ContentType } from './tooltip.directive';

@Component({
    selector: 'tooltip',
    templateUrl: './tooltip.component.html',
    styleUrls: ['./tooltip.component.scss']
})

export class TooltipComponent implements OnInit, OnDestroy {

    events = new EventEmitter();

    // The observable below will inform error-tooltip-directive when user clicked on tooltip:
    private userClickOnTooltipSubject = new Subject<void>();
    userClickOnTooltip$ = this.userClickOnTooltipSubject.asObservable();    

    destroy$ = new Subject<void>();

	@HostBinding('class.tooltip') tooltipClass = true;
    @HostBinding('style.top') hostStyleTop!: string;
    @HostBinding('style.left') hostStyleLeft!: string;
    @HostBinding('style.z-index') hostStyleZIndex!: number;
    @HostBinding('style.transition') hostStyleTransition!: string;
    @HostBinding('style.width') hostStyleWidth!: string;
    @HostBinding('style.max-width') hostStyleMaxWidth!: string;
    @HostBinding('style.pointer-events') hostStylePointerEvents!: string;
    @HostBinding('class.tooltip-show') hostClassShow!: boolean;
    @HostBinding('class.tooltip-hide') hostClassHide!: boolean;
    @HostBinding('class.tooltip-display-none') hostClassDisplayNone!: boolean;
    @HostBinding('class.tooltip-shadow') hostClassShadow!: boolean;
    @HostBinding('class.tooltip-light') hostClassLight!: boolean;
    @HostBinding('class.tooltip-white-blue') hostClassWhiteBlue!: boolean;


    tooltipStr!: string;
    tooltipHtml!: SafeHtml;
    tooltipTemplate!: TemplateRef<any>;

    currentContentType!: ContentType;
    isLightTheme!: boolean;
    originalPlacement!: Placement; // placement defined by user
    autoPlacement!: boolean;
    hostElement!: any;
    hostElementPosition!: { top: number, left: number } | DOMRect;
    tooltipOffset!: number;

    currentPlacement: Placement | undefined; 

    constructor(private elementRef: ElementRef,
                private renderer: Renderer2) {}

    ngOnInit() {
    	this.listenToFadeInEnd();
    	this.listenToFadeOutEnd();
    }
    
    /* Methods that are invoked by tooltip.directive.ts */

    showTooltip(config: TooltipDto) {
        this.setTooltipProperties(config);

    	this.hostClassDisplayNone = false;

    	// 'setTimeout()' prevents the tooltip from 'jumping around' +
        // hostClassDisplayNone has to be called before hostClassShow and hostClassHide
        // to make the transition animation work.
        setTimeout(() => {
    		this.hostClassShow = true;
    		this.hostClassHide = false;
    		this.setPosition();
    	});
    }

    hideTooltip() {
    	this.hostClassShow = false;
    	this.hostClassHide = true;
    }

    setPosition(): void {
    	const allPlacements: Placement[] = [ 'bottom-left', 'bottom', 'top-left', 'left', 'top', 'right' ];

    	if (this.setHostStyle(this.originalPlacement)) {
    		this.removeAllPlacementClasses(allPlacements);
    		this.setPlacementClass(this.originalPlacement);
    		return;
    	}
    	else {
    		/* Is tooltip outside the visible area */
    		const currentPlacement = this.currentPlacement ?? this.originalPlacement;
    		let isPlacementSet = false;

    		for (const placement of allPlacements) {
    			if (this.setHostStyle(placement)) {
    				this.removeAllPlacementClasses(allPlacements);
    				this.setPlacementClass(placement);
    				isPlacementSet = true;
    				return;
    			}
    		}

    		/* Set original placement */
    		if (!isPlacementSet) {
    			this.setHostStyle(currentPlacement, true);
    			this.setPlacementClass(currentPlacement);
    		}
    	}
    }

    /* Methods that get invoked by html */

    handleTooltipClick() {
    	this.userClickOnTooltipSubject.next();
    }

    private listenToFadeInEnd() {
    	fromEvent(this.elementRef.nativeElement, 'transitionend')
    		.pipe(
    			filter(() => this.hostClassShow),
    			tap(() => this.events.emit({ type: 'shown' })),
    			takeUntil(this.destroy$),
    		)
    		.subscribe();
    }

    private listenToFadeOutEnd() {
    	fromEvent(this.elementRef.nativeElement, 'transitionend')
    		.pipe(
    			filter(() => this.hostClassHide),
    			tap(() => this.hostClassDisplayNone = true),
    			tap(() => this.events.emit({ type: 'hidden' })),
    			takeUntil(this.destroy$),
    		)
    		.subscribe();
    }

    private setTooltipProperties(config: TooltipDto) {
        this.currentContentType = config.options.contentType ?? 'string';
        this.tooltipStr = this.currentContentType === 'string' ? config.tooltipStr : '';
        this.tooltipHtml = this.currentContentType === 'html' ? config.tooltipHtml : '';
        this.tooltipTemplate = this.currentContentType === 'template' ? config.tooltipTemplate : {} as TemplateRef<any>;

        this.isLightTheme = config.options.theme === 'light' || config.options.theme === 'white-blue';
        this.originalPlacement = config.options.placement!;
        this.autoPlacement = config.options.autoPlacement!;
        this.hostElement = config.hostElement;
        this.hostElementPosition = config.hostElementPosition;
        this.tooltipOffset = Number(config.options.offset);
        
        this.setCustomClass(config.options);
        this.setZIndex(config.options);
        this.setPointerEvents(config.options);
        this.setAnimationDuration(config.options);
        this.setStyles(config.options);
    }

    private setPlacementClass(placement: Placement | undefined): void {
    	this.currentPlacement = placement;
    	this.renderer.addClass(this.elementRef.nativeElement, `tooltip-${placement ?? ''}`);
    }

    private removeAllPlacementClasses(placements: Placement[]): void {
    	placements.forEach(placement => {
    		this.renderer.removeClass(this.elementRef.nativeElement, `tooltip-${placement}`);
    	});
    }

    private setHostStyle(placement: Placement | undefined, disableAutoPlacement = false): boolean {
    	const isFormCtrlSVG = this.hostElement instanceof SVGElement;
    	const tooltip = this.elementRef.nativeElement;
    	// In case the user passed a custom position, the object would just contain {top: number, left: number}
    	const isCustomPosition = !(this.hostElementPosition instanceof DOMRect);

    	let formControlHeight = isFormCtrlSVG ? this.hostElement.getBoundingClientRect().height : this.hostElement.offsetHeight;
    	let formControlWidth = isFormCtrlSVG ? this.hostElement.getBoundingClientRect().width : this.hostElement.offsetWidth;
    	const tooltipHeight = tooltip.clientHeight;
    	const tooltipWidth = tooltip.clientWidth;
    	const scrollY = window.scrollY;

    	if (isCustomPosition) {
    		formControlHeight = 0;
    		formControlWidth = 0;
    	}

    	let topStyle;
    	let leftStyle;

    	if (placement === 'top' || placement === 'top-left') {
    		topStyle = (this.hostElementPosition.top + scrollY) - (tooltipHeight + this.tooltipOffset);
    	}

    	if (placement === 'bottom' || placement === 'bottom-left') {
    		topStyle = (this.hostElementPosition.top + scrollY) + formControlHeight + this.tooltipOffset;
    	}

    	if (placement === 'top' || placement === 'bottom') {
    		leftStyle = (this.hostElementPosition.left + formControlWidth / 2) - tooltipWidth / 2;
    	}

    	if (placement === 'bottom-left' || placement === 'top-left') {
    		leftStyle = this.hostElementPosition.left;
    	}

    	if (placement === 'left') {
    		leftStyle = this.hostElementPosition.left - tooltipWidth - this.tooltipOffset;
    	}

    	if (placement === 'right') {
    		leftStyle = this.hostElementPosition.left + formControlWidth + this.tooltipOffset;
    	}

    	if (placement === 'left' || placement === 'right') {
    		topStyle = (this.hostElementPosition.top + scrollY) + formControlHeight / 2 - tooltip.clientHeight / 2;
    	}

    	/* Is tooltip outside the visible area */
    	if (this.autoPlacement && !disableAutoPlacement) {
    		const topEdge = topStyle;
    		const bottomEdge = topStyle + tooltipHeight;
    		const leftEdge = leftStyle;
    		const rightEdge = leftStyle + tooltipWidth;
    		const bodyHeight = window.innerHeight + scrollY;
    		const bodyWidth = document.body.clientWidth;

    		if (topEdge < 0 || bottomEdge > bodyHeight || leftEdge < 0 || rightEdge > bodyWidth) {
    			return false;
    		}
    	}

    	this.hostStyleTop = `${topStyle}px`;
    	this.hostStyleLeft = `${leftStyle}px`;

    	return true;
    }

    private setCustomClass(options: TooltipOptions){
        if (options.tooltipClass) {
            options.tooltipClass.split(' ').forEach((className:any) => {
                this.renderer.addClass(this.elementRef.nativeElement, className);
            });
        }
    }

    private setZIndex(options: TooltipOptions): void {
        if (options.zIndex !== 0) {
            this.hostStyleZIndex = options.zIndex ?? defaultOptions.zIndex ?? 0;
        }
    }

    private setPointerEvents(options: TooltipOptions): void {
        if (options.pointerEvents) {
            this.hostStylePointerEvents = options.pointerEvents;
        }
    }

    private setAnimationDuration(options: TooltipOptions) {
    	const animationDuration = !!options.animationDuration ? options.animationDuration : options.animationDurationDefault;
    	this.hostStyleTransition = `opacity ${animationDuration}ms`;
    }

    private setStyles(options: TooltipOptions) {
        this.hostClassShadow = options.shadow ?? true;
        this.hostClassLight = options.theme === 'light' || options.theme === 'white-blue';
        this.hostClassWhiteBlue = options.theme === 'white-blue';
        this.hostStyleMaxWidth = options.maxWidth ?? '';
        this.hostStyleWidth = options.width ? options.width : '';
    }

    ngOnDestroy(): void {
    	this.destroy$.next();
    	this.destroy$.unsubscribe();
    }
}

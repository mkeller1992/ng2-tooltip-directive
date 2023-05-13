import { ApplicationRef, ComponentRef, Directive, ElementRef, EventEmitter, HostListener, Inject, Injector, Input, OnChanges, OnDestroy, OnInit, Optional, Output, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { auditTime, EMPTY, exhaustMap, filter, first, fromEvent, merge, NEVER, of, race, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { defaultOptions } from './default-options.const';
import { TooltipOptions } from './options.interface';
import { TooltipOptionsService } from './options.service';
import { Placement } from './placement.type';
import { TooltipComponent } from './tooltip.component';
import { TooltipDto } from './tooltip.dto';

export type ContentType = "string" | "html" | "template";

@Directive({
    selector: '[tooltip]',
    exportAs: 'tooltip',
})

export class TooltipDirective implements OnInit, OnChanges, OnDestroy {

	// A merge of all options that were passed in various ways:
	private mergedOptions!: TooltipOptions;

    // Will contain all options collected from the @Inputs
	private collectedOptions: Partial<TooltipOptions> = {};

    // Pass options as a single object:
    @Input()
	options: TooltipOptions = {};


    @Input()
    tooltipStr!: string;

    @Input()
    tooltipHtml!: SafeHtml;

    @Input()
    tooltipTemplate!: TemplateRef<any>;


	@Input()
	set id(val: string | number) {
	  	this.collectedOptions.id = val;
	}

    @Input()
    set contentType(val: ContentType) {
        this.collectedOptions.contentType = val;
    }

	@Input()
	set placement(val: Placement) {
	  	this.collectedOptions.placement = val;
	}

	@Input()
	set autoPlacement(val: boolean) {
	 	 this.collectedOptions.autoPlacement = val;
	}

    @Input()
    set hideDelayTouchscreen(val: number) {
        this.collectedOptions.hideDelayTouchscreen = val;
    }

	@Input()
	set zIndex(val: number) {
	  	this.collectedOptions.zIndex = val;
	}

    @Input()
    set animationDuration(val: number) {
        this.collectedOptions.animationDuration = val;
    }

    @Input()
    set trigger(val: 'hover' | 'click') {
        this.collectedOptions.trigger = val;
    }

    @Input()
    set tooltipClass(val: string) {
        this.collectedOptions.tooltipClass = val;
    }

    @Input()
    set display(val: boolean) {
        this.collectedOptions.display = val;
    }

    @Input()
    set displayMobile(val: boolean) {
        this.collectedOptions.displayMobile = val;
    }

    @Input()
    set displayTouchscreen(val: boolean) {
        this.collectedOptions.displayTouchscreen = val;
    }

    @Input()
    set shadow(val: boolean) {
        this.collectedOptions.shadow = val;
    }

    @Input()
    set theme(val: 'dark' | 'light' | 'white-blue') {
        this.collectedOptions.theme = val;
    }

    @Input()
    set offset(val: number) {
        this.collectedOptions.offset = val;
    }

    @Input()
    set width(val: string) {
        this.collectedOptions.width = val;
    }

    @Input()
    set maxWidth(val: string) {
        this.collectedOptions.maxWidth = val;
    }

    @Input()
    set showDelay(val: number) {
        this.collectedOptions.showDelay = val;
    }
    
    @Input()
    set hideDelay(val: number) {
        this.collectedOptions.hideDelay = val;
    }

    @Input()
    set hideDelayAfterClick(val: number) {
        this.collectedOptions.hideDelayAfterClick = val;
    }

    @Input()
    set pointerEvents(val: 'auto' | 'none') {
        this.collectedOptions.pointerEvents = val;
    }

	@Input()
	set position(val: { top: number; left: number }) {
	 	this.collectedOptions.position = val;
	}


    @Output()
    events: EventEmitter<any> = new EventEmitter<any>();


    private refToTooltipComponent: ComponentRef<TooltipComponent> | undefined;
	private tooltipComponent: TooltipComponent | undefined;

    private isTooltipVisible = false;

    get isTooltipComponentDestroyed(): boolean {        
		return !this.refToTooltipComponent?.location.nativeElement.isConnected;
    }

    get calculatedHideDelay(): number {
        return this.isTouchScreen && this.mergedOptions.hideDelayTouchscreen ?
               this.mergedOptions.hideDelayTouchscreen : (this.mergedOptions.hideDelay ?? 0);
    }

    get hostElementPosition(): { top: number, left: number } | DOMRect {
        return this.mergedOptions.position ?? this.hostElementRef.nativeElement.getBoundingClientRect();
    }

    get isDisplayOnHover(): boolean {
        if (this.mergedOptions.display == false ||
            (this.mergedOptions.displayTouchscreen == false && this.isTouchScreen) ||
            this.mergedOptions.trigger !== 'hover') {
            return false;
        }
        return true;
    }

    get isDisplayOnClick(): boolean {
        if (this.mergedOptions.display == false ||
            (this.mergedOptions.displayTouchscreen == false && this.isTouchScreen) ||
            this.mergedOptions.trigger != 'click') {
            return false;
        }
        return true;
    }

    get isTouchScreen() {
        console.warn('is touchscreen:', ('ontouchstart' in window) || window.matchMedia('(any-pointer: coarse)').matches);
        return ('ontouchstart' in window) || window.matchMedia('(any-pointer: coarse)').matches;
    }

    private clearTimeouts$ = new Subject<void>();
	private destroy$ = new Subject<void>();


    constructor(
        @Optional() @Inject(TooltipOptionsService) private initOptions: TooltipOptions,
        private hostElementRef: ElementRef,
        private viewContainerRef: ViewContainerRef,
        private appRef: ApplicationRef,
        private injector: Injector) {}


    ngOnInit(): void {

        console.warn('On init');

		// On click on input-field: Hide tooltip
		this.listenToClickOnHostElement();

        this.listenToMouseEnterAndFocusIn();
        this.listenToMouseLeaveAndFocusOut();

		// The tooltip-position needs to be adjusted when user scrolls or resizes the window:
		this.listenToScrollAndResizeEvents();        
    }

    ngOnChanges(changes: SimpleChanges) {
        // Map tooltip options:
        this.mergedOptions = this.getMergedTooltipOptions();
        console.warn('On changes', this.mergedOptions);
    }

    /** Public User-Methods **/

	public show() {
		if ((this.mergedOptions.contentType === 'string' && this.tooltipStr) ||
            (this.mergedOptions.contentType === 'html' && this.tooltipHtml) ||
            (this.mergedOptions.contentType === 'template' && this.tooltipTemplate)) {
                     
            if (this.tooltipComponent && !this.isTooltipComponentDestroyed) {
                this.showTooltip();
            }
            else {
                this.createTooltip();
            }                
        }
	}

	public hide() {
        if (this.isTooltipVisible) {
            this.hideTooltip();
        }
	}


    /** Private library-Methods **/


    /* Reacts only in 'isDisplayOnClick'-mode */
    private listenToClicksOnTooltip(tooltipComponent: TooltipComponent) {        
		tooltipComponent.userClickOnTooltip$
			.pipe(
                filter(() => this.isDisplayOnClick && this.isTooltipVisible),
                tap(() => this.hideTooltip()),
				takeUntil(this.destroy$)
			)
			.subscribe();
	}

    /* Reacts only in 'isDisplayOnClick'-mode */
	private listenToClickOnHostElement() {
        fromEvent(this.hostElementRef.nativeElement, 'click')
            .pipe(
                filter(() => this.isDisplayOnClick),
                tap(() => this.show()),
                filter(() => !!this.mergedOptions.hideDelayAfterClick && this.mergedOptions.hideDelayAfterClick > 0),
                // Cancel pipe when further clicks on the host-element are made:
                switchMap(() => {
                    const obsHideTooltipAfterDelay = timer(this.mergedOptions.hideDelayAfterClick ?? 0)
                                                        .pipe(tap(() => this.hideTooltip()));  
                    // Make delay cancellable:                
                    // Executes obsHideTooltipAfterDelay, given clearTimeouts$ isn't called before hideDelay has elapsed:
                    return race(obsHideTooltipAfterDelay, this.clearTimeouts$);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe();
	}

    /* Listens to mouse-enter and focus-in on the host-element */
    private listenToMouseEnterAndFocusIn() {
        const mouseEnter$ = fromEvent(this.hostElementRef.nativeElement, 'mouseenter');
        const focusIn$ = fromEvent(this.hostElementRef.nativeElement, 'focusin');
      
        merge(mouseEnter$, focusIn$)
          .pipe(
            filter(() => this.isDisplayOnHover),
            tap(() => this.clearTimeouts$.next()),
            switchMap(() => {
                const obsShowTooltipAfterDelay = timer(this.mergedOptions.showDelay ?? 0)
                                                    .pipe(tap(() => this.show()));  
                // Make delay cancellable:                
                // Executes obsHideTooltipAfterDelay, given clearTimeouts$ isn't called before hideDelay has elapsed:
                return race(obsShowTooltipAfterDelay, this.clearTimeouts$);
            }),
            takeUntil(this.destroy$)
          )
          .subscribe();
    }

    /* Listens to mouse-leave and focus-out on the host-element */
    private listenToMouseLeaveAndFocusOut() {
        const mouseLeave$ = fromEvent(this.hostElementRef.nativeElement, 'mouseleave');
        const focusOut$ = fromEvent(this.hostElementRef.nativeElement, 'focusout');
      
        merge(mouseLeave$, focusOut$)
          .pipe(
            filter(() => this.isDisplayOnHover),
            tap(() => this.clearTimeouts$.next()),
            switchMap(() => {
                const obsHideTooltipAfterDelay = timer(this.mergedOptions.hideDelay ?? 0)
                                                    .pipe(tap(() => this.hideTooltip()));  
                // Make delay cancellable:                
                // Executes obsHideTooltipAfterDelay, given clearTimeouts$ isn't called before hideDelay has elapsed:
                return race(obsHideTooltipAfterDelay, this.clearTimeouts$);
            }),
            takeUntil(this.destroy$)
          )
          .subscribe();
    }

    /* The tooltip-position needs to be adjusted when user scrolls or resizes the window */
	private listenToScrollAndResizeEvents() {
		const scroll$ = fromEvent(window, 'scroll');
		const resize$ = fromEvent(window, 'resize');

		merge(scroll$, resize$)
			.pipe(
				// For 'auditTime' check the following stackoverflow-article:
				// 'Rxjs: How to use bufferTime while only triggering an emission when new values have arrived'
				auditTime(100),
				filter(() => this.isTooltipVisible && !!this.tooltipComponent),
				tap(() => {
					if (this.tooltipComponent) {
						this.tooltipComponent.hostElementPosition = this.hostElementPosition;
						this.tooltipComponent.setPosition();
					}
				}),
				takeUntil(this.destroy$),
			)
			.subscribe();
	}


	private createTooltip() {
		// Stop all ongoing processes:
		this.clearTimeouts$.next();

		timer(this.mergedOptions.showDelay ?? 0)
			.pipe(
				first(),
		  		takeUntil(this.destroy$ || this.clearTimeouts$),
		  		tap(() => {
					this.appendComponentToBody();
					this.showTooltip();
				}),
				takeUntil(this.destroy$)
			)
			.subscribe();
	}

    appendComponentToBody(): void {
        // Create the component using the ViewContainerRef.
        // This way the component is automatically added to the change detection cycle of the Angular application
        this.refToTooltipComponent = this.viewContainerRef.createComponent(TooltipComponent, { injector: this.injector });
        this.tooltipComponent = this.refToTooltipComponent.instance;

        // Attach tooltip-click listener:
		this.listenToClicksOnTooltip(this.tooltipComponent);

		if(!this.tooltipComponent) { return; }     
      
        // Get the DOM element from the component's view.
        const domElemTooltip = (this.refToTooltipComponent.location.nativeElement as HTMLElement);
      
        // Append the DOM element to the document body.
        document.body.appendChild(domElemTooltip);
      
    	// Subscribe to events from the component.
    	this.tooltipComponent?.events
			.pipe(
				takeUntil(this.destroy$),
				tap((eventType) => {
					eventType === 'shown' && this.events.emit({ type: 'shown', position: this.hostElementPosition });
					eventType === 'hidden' && this.events.emit({ type: 'hidden', position: this.hostElementPosition });
				})
			)
            .subscribe();
    }

	private showTooltip(): void {
		if (this.tooltipComponent) {
			// Stop all ongoing processes:
			this.clearTimeouts$.next();

            this.events.emit({ type: 'show', position: this.hostElementPosition });

            // Set the data property of the component instance
            const tooltipData: TooltipDto = {
                tooltipStr: this.tooltipStr,
                tooltipHtml: this.tooltipHtml,
                tooltipTemplate: this.tooltipTemplate,
                hostElement: this.hostElementRef.nativeElement,
                hostElementPosition: this.hostElementPosition,
                options: this.mergedOptions
            };

			this.tooltipComponent.showTooltip(tooltipData);
			this.isTooltipVisible = true;
		}
	}

	private hideTooltip(): void {
		// Make sure no hiding-processes are ongoing:
		this.clearTimeouts$?.next();

    	if (this.isTooltipVisible && !this.isTooltipComponentDestroyed) {

			this.events.emit({ type: 'hide', position: this.hostElementPosition });

			this.tooltipComponent?.hideTooltip();
			this.isTooltipVisible = false;
    	}
	}

	private destroyTooltip(): void {
		this.clearTimeouts$?.next();
        this.destroy$?.next();

		if(!this.isTooltipComponentDestroyed && this.refToTooltipComponent) {
			const tooltipVisibleAtStart = this.isTooltipVisible;

			if (tooltipVisibleAtStart) {
				this.events.emit({ type: 'hide', position: this.hostElementPosition });
			}

            this.appRef.detachView(this.refToTooltipComponent.hostView);
            this.refToTooltipComponent.destroy();

			if (tooltipVisibleAtStart) {
				this.events.emit({ type: 'hidden', position: this.hostElementPosition })
			}
		}

		this.tooltipComponent = undefined;
		this.refToTooltipComponent = undefined;
	}

    private getMergedTooltipOptions(): TooltipOptions {
    	// Merge options: the priority order is as follows:        
		// 1. Individual options passed via @Input
		// 2. The options-object passed via @Input
        // 3. Options passed via module
		// 4. The default options
    	return Object.assign({}, defaultOptions, this.initOptions || {}, this.options, this.collectedOptions);
	}

	ngOnDestroy(): void {
		this.destroyTooltip();
		this.clearTimeouts$.unsubscribe();		
		this.destroy$.unsubscribe();
	}
}

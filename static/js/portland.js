const Portland = (() => {

const Direction = { LEFT: Symbol(), UP: Symbol(), RIGHT: Symbol(), DOWN: Symbol() };
const HORIOZNTAL = Symbol(), VERTICAL = Symbol();

const PortletController = class {
    constructor(inputInterpreter, portlandManager) {
        if(!is(inputInterpreter, InputInterpreter)) err();
        if(!is(portlandManager, PortlandManager)) err();
        
        prop(this, { inputInterpreter, portlandManager });
        this.listener = e => { e.stopPropagation(); this._control(e); };
    }
    get eventType() { return this.inputInterpreter.eventType; }
    initialize(portlandId) {
        this._initialize(portlandId, false);
    }
    changeTheWorld(portlandId) {
        this._initialize(portlandId, true);
    }
    _initialize(portlandId, maintainState) {
        this.portland = this.portlandManager.get(portlandId);
        if(!this.portland) err('invalid portlandId');
        this.portlandManager.active(portlandId);
        if(!maintainState || !this.portland.initialized) this.portland.initialize(this.eventType, this.listener);
    }
    refresh(base) {
        const portlet = this._portlet(base);
        if(!is(portlet, Portlet)) err();
        
        this.portland.initializePartial(this.inputInterpreter.eventType, this.listener, portlet);
    }
    portlize(dom, x, y, w, h) {
        if(!dom || !dom.dataset || isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) err();
        dom.dataset.portlet = `${x} ${y} ${w} ${h}`;
    }
    show(base, direction = HORIOZNTAL) {
        const portlet = this._portlet(base);
        if(!portlet) err();

        if(!this.portland.isHide(portlet)) return;

        switch(direction) {
            case HORIOZNTAL: direction = Direction.RIGHT; break;
            case VERTICAL: direction = Direction.DOWN; break;
            default: err();
        }
        this.portland.show(portlet, direction);
    }
    hide(base, direction = HORIOZNTAL) {
        const portlet = this._portlet(base);
        if(!portlet) err();

        if(this.portland.isHide(portlet)) return;
        
        switch(direction) {
            case HORIOZNTAL: direction = Direction.LEFT; break;
            case VERTICAL: direction = Direction.UP; break;
            default: err();
        }
        this.portland.hide(portlet, direction);
    }
    isHide(base) {
        const portlet = this._portlet(base);
        if(!portlet) err();

        return this.portland.isHide(portlet);
    }
    sizeUp(base, direction = HORIOZNTAL, step = 1) {
        const portlet = this._portlet(base);
        if(!portlet) err();

        switch(direction) {
            case HORIOZNTAL: direction = Direction.RIGHT; break;
            case VERTICAL: direction = Direction.DOWN; break;
            default: err();
        }
        this.portland.changeSize(portlet, direction, step);
    }
    sizeDown(base, direction = HORIOZNTAL, step = 1) {
        const portlet = this._portlet(base);
        if(!portlet) err();

        switch(direction) {
            case HORIOZNTAL: direction = Direction.LEFT; break;
            case VERTICAL: direction = Direction.UP; break;
            default: err();
        }
        this.portland.changeSize(portlet, direction, step);
    }
    saveMacro(number) {
        // target = portland > portlets
        // portland.toJson -> JSON.strnigify(obj) -> save
    }
    loadMacro(number) {
        // JSON.parse(str) -> restore(with animation)
    }
    _portlet(base) {
        const element = sel(base);
        if(!element) err();
        
        let a = null;
        this.portland.portlets.some(p => { if(p.dom === element.dom) return a = p; });
        return a;
    }
    _checkInitialized() {
        if(!this.portland) err('not initialized');
    }
    _control(event) {
        this._checkInitialized();
        
        const { command, target, input } = this.inputInterpreter.interpret(event, this.portland.portlets);
        
        if(!command) return;

        switch(command) {
            case InputInterpreter.command.CHANGE_LOCATION:
                if(!is(target, Portlet) || !is(input, Direction)) return;
                this.portland.changeLocation(target, input);
                break;
            case InputInterpreter.command.CHANGE_SIZE:
                if(!is(target, Portlet) || !is(input, Direction)) return;
                this.portland.changeSize(target, input);
                break;
            case InputInterpreter.command.FOCUS:
                const number = input;
                if(isNaN(number)) this.portland.showPortletNumbers();
                else {
                    if(this.portland.contains(number))
                        this.portland.focus(number);
                    else
                        return;
                }
                break;
            case InputInterpreter.command.SHOW_OR_HIDE:
                if(!is(target, Portlet) || !is(input, Direction)) return;
                if(this.portland.isHide(target))
                    this.portland.show(target, input);
                else
                    this.portland.hide(target, input);
                break;
            default: err();
        }
    }    
};

const InputInterpreter = class {
    interpret(event, portlets) { override(); }
    get eventType() { override(); }
}
InputInterpreter.command = { CHANGE_LOCATION: Symbol(), CHANGE_SIZE: Symbol(), FOCUS: Symbol(), SHOW_OR_HIDE: Symbol() };
const KeyboardInputInterpreter = class extends InputInterpreter {
    interpret(event, portlets) {
        let command, target, input;
        
        portlets.some(p => { if(p.dom === event.target) return target = p; });

        switch(true) {
            case event.ctrlKey:
                command = InputInterpreter.command.CHANGE_LOCATION;
                input = KeyboardInputInterpreter.direction[event.keyCode];
                if(target) event.returnValue = false;
                break;
            case event.shiftKey && event.altKey:
                command = InputInterpreter.command.SHOW_OR_HIDE;
                input = KeyboardInputInterpreter.direction[event.keyCode];
                if(target) event.returnValue = false;
                break;
            case event.shiftKey:
                command = InputInterpreter.command.CHANGE_SIZE;
                input = KeyboardInputInterpreter.direction[event.keyCode];
                if(target) event.returnValue = false;
                break;
            case event.altKey:
                command = InputInterpreter.command.FOCUS;
                input = KeyboardInputInterpreter.number[event.keyCode];
                event.returnValue = false;
                break;
            default: break;
        }
        
        return { command, target, input };
    }
    get eventType() {
        return 'keydown';
    }
};
KeyboardInputInterpreter.direction = { 37: Direction.LEFT, 38: Direction.UP, 39: Direction.RIGHT, 40: Direction.DOWN };
KeyboardInputInterpreter.number = { 48: 0, 49: 1, 50: 2, 51: 3, 52: 4, 53: 5, 54: 6, 55: 7, 56: 8, 57: 9 };

const PortlandManager = class {
    constructor() {
        this._initialize();
    }
    _initialize() {
        this.portlands = [];
        const domes = document.querySelectorAll('[data-portland]');
        for(const d of domes) {
            const pland = new Portland(d, new GeometryCalculator(), new AnimationSelector(), new Renderer());
            this.portlands.push(pland.die());
        }
    }    
    get(id) {
        for(const pland of this.portlands)
            if(pland.id === id) return pland;
        return null;
    }
    active(id) {
        if(this.activated) this.activated.die();
        this.activated = this.get(id).live();
    }    
};

const Portland = class {
    constructor(dom, geometryCalculator, animationSelector, renderer) {
        if(!is(geometryCalculator, GeometryCalculator)) err();
        if(!is(animationSelector, AnimationSelector)) err();
        if(!is(renderer, Renderer)) err();

        prop(this, { dom, geometryCalculator, animationSelector, renderer, id: dom.dataset.portland, initialized: false });
    }
    die() {
        this.dom.style.display = 'none';
        return this;
    }
    live() {
        this.dom.style.display = '';
        return this;
    }    
    initialize(eventType, listener) {
        this.initialized = true;
        this.portlets = [];
        this.root = new Portlet(0, 0, Portlet.divideN, Portlet.divideN, this.dom);
        this.initializePartial(eventType, listener, this.root);
    }
    initializePartial(eventType, listener, parent){
        if(!this.initialized) err('not initialized');
        if(parent == this.root) window.addEventListener(eventType, listener);
        
        const domes = parent.dom.querySelectorAll(':scope > [data-portlet]');
        for(const d of domes) {
            d.addEventListener(eventType, listener);
            d.tabIndex = '0';
            
            const [x, y, w, h] = d.dataset.portlet.split(' ').map(e => parseFloat(e));
            const p = new Portlet(x, y, w, h, d);
            if(!w || !h) this._markHidden(p);
            parent.append(p);
            this.portlets.push(p);
            this.renderer.render(p);

            this.initializePartial(eventType, listener, p);
        }
    }
    changeLocation(target, direction) {
        if(!is(target, Portlet)) err();
        if(!is(direction, Direction)) err();
        
        this._change(target, direction, 'calculateLocation');
    }
    changeSize(target, direction, step = 1) {
        if(!is(target, Portlet)) err();
        if(!is(direction, Direction)) err();
        
        if(target.hide || this.geometryCalculator.willZeroSize(target, direction, step)) return;
        this._changeSize(target, direction, step);
    }
    _changeSize(target, direction, step) {
        this._change(target, direction, 'calculateSize', step);
    }
    _change(target, direction, method, step) {
        const targets = this.geometryCalculator[method](target, direction, target.parent.children, step);
        
        for(const t of targets) {
            t.portlet.location(t.x, t.y);
            t.portlet.size(t.w, t.h);
            const animation = t.portlet === target ? this.animationSelector.get(AnimationSelector.type.TARGET) : this.animationSelector.get(AnimationSelector.type.OTHER);

            this.renderer.render(t.portlet, animation);
        }
    }
    contains(number) {
        return !!this.portlets[number];
    }
    isHide(portlet) {
        if(portlet && portlet.hide)
            return true;
        else
            return false;
    }
    focus(number) {
        const p = this.portlets[number];
        if(p) p.dom.focus();
    }
    show(portlet, direction) {
        if(this.isHide(portlet)) {
            let step;
            switch(direction) {
                case Direction.RIGHT:
                    step = portlet.hide.w || this.geometryCalculator.remainingSpace(portlet, this.portlets, direction) || 1;
                    this._changeSize(portlet, Direction.RIGHT, step);
                    break;
                case Direction.DOWN:
                    step = portlet.hide.h || this.geometryCalculator.remainingSpace(portlet, this.portlets, direction) || 1;
                    this._changeSize(portlet, Direction.DOWN, step);
                    break;
                default: return;
            }
            this._unmarkHidden(portlet);
        }
    }
    hide(portlet, direction) {
        if(portlet) {
            this._markHidden(portlet);
            switch(direction) {
                case Direction.LEFT:
                    this._changeSize(portlet, Direction.LEFT, portlet.hide.w);
                    break;
                case Direction.UP:
                    this._changeSize(portlet, Direction.UP, portlet.hide.h);
                    break;
                default:
                    this._unmarkHidden(portlet);
                    return;
            }
        }
    }
    _markHidden(portlet) {
        if(!portlet.hide) {
            portlet.hide = { w: portlet.w, h: portlet.h, border: portlet.dom.style.border };
            portlet.dom.style.border = '';
        }
    }
    _unmarkHidden(portlet) {
        if(portlet.hide) {
            portlet.dom.style.border = portlet.hide.border;
            delete portlet.hide;
        }
    }
    showPortletNumbers() {
        // TODO
    }
    toJson() {
        // TODO
        const result = [];
        
        for(const p of this.portlets) {
            
        }

        return result;
    }
};

const GeometryCalculator = class {
    remainingSpace(p1, portlets, direction) {
        let remaining = 0;

        [...portlets]
            .filter(p2 => {
                if(p2.hide || p1 === p2) return false;
                
                switch(true) {
                    case this._isHorizontal(direction):
                        const collisionVertical = (p1.y <= p2.y && p1.y+p1.h > p2.y) || (p1.y < p2.y+p2.h && p1.y+p1.h >= p2.y+p2.h);
                        return collisionVertical;
                    case this._isVertical(direction):
                        const collisionHorizontal = (p1.x <= p2.x && p1.x+p1.x > p2.x) || (p1.x < p2.x+p2.w && p1.x+p1.w >= p2.x+p2.w);
                        return collisionHorizontal;
                    default: err();
                }
            })
            .map(p => remaining += this._isHorizontal(direction) ? p.w : p.h);

        return p1.parent.divideN - remaining;
    }
    willZeroSize(portlet, direction, step) {
        step = this._stepWithDirection(direction, step);

        switch(true) {
            case this._isHorizontal(direction): return portlet.w+step <= 0;
            case this._isVertical(direction): return portlet.h+step <= 0;
            default: err();
        }
    }
    _isHorizontal(direction) {
        return direction === Direction.LEFT || direction === Direction.RIGHT;
    }
    _isVertical(direction) {
        return direction === Direction.UP || direction === Direction.DOWN;
    }
    calculateLocation(portlet, direction, portlets) {
        const result = [];
        const p1 = portlet;
        const p2 = this._findSecondTarget(p1, direction, portlets);
        
        if(!p2) return [];

        switch(direction) {
            case Direction.LEFT:
                result.push({ portlet: p1, x: p2.x, y: p1.y, w: p1.w, h: p1.h });
                result.push({ portlet: p2, x: p2.x+p1.w, y: p2.y, w: p2.w, h: p2.h });
                break;
            case Direction.UP:
                result.push({ portlet: p1, x: p1.x, y: p2.y, w: p1.w, h: p1.h });
                result.push({ portlet: p2, x: p2.x, y: p2.y+p1.h, w: p2.w, h: p2.h });
                break;
            case Direction.RIGHT:
                result.push({ portlet: p1, x: p1.x+p2.w, y: p1.y, w: p1.w, h: p1.h });
                result.push({ portlet: p2, x: p1.x, y: p2.y, w: p2.w, h: p2.h });
                break;
            case Direction.DOWN:
                result.push({ portlet: p1, x: p1.x, y: p1.y+p2.h, w: p1.w, h: p1.h });
                result.push({ portlet: p2, x: p2.x, y: p1.y, w: p2.w, h: p2.h });
                break;
            default: break;
        }

        return result;
    }
    _findSecondTarget(p1, direction, portlets) {
        let p2;
        for(const p of portlets) {
            if(p === p1) continue;

            let passedPolicy = false;
            switch(direction) {
                case Direction.LEFT:
                    const policy_yhEqual_leftThan = p1.y === p.y && p1.h === p.h && p1.x > p.x;
                    passedPolicy = policy_yhEqual_leftThan && (!p2 || p.x > p2.x);
                    break;
                case Direction.UP:
                    const policy_xwEqual_upThan = p1.x === p.x && p1.w === p.w && p1.y > p.y;
                    passedPolicy = policy_xwEqual_upThan && (!p2 || p.y > p2.y);
                    break;
                case Direction.RIGHT:
                    const policy_yhEqual_rightThan = p1.y === p.y && p1.h === p.h && p1.x < p.x;
                    passedPolicy = policy_yhEqual_rightThan && (!p2 || p.x < p2.x);
                    break;
                case Direction.DOWN:
                    const policy_xwEqual_downThan = p1.x === p.x && p1.w === p.w && p1.y < p.y;
                    passedPolicy = policy_xwEqual_downThan && (!p2 || p.y < p2.y);
                    break;
                default: return;
            }
            if(passedPolicy) p2 = p;
        }
        return p2;
    }    
    calculateSize(portlet, direction, portlets, step = 1) {
        const result = [];
        const p = portlet;                
        let stepW = 0, stepH = 0;
        
        step = this._stepWithDirection(direction, step);
        
        switch(true) {
            case this._isHorizontal(direction): stepW = step; break;
            case this._isVertical(direction): stepH = step; break;
            default: return [];
        }

        result.push({ portlet: p, x: p.x, y: p.y, w: p.w+stepW, h: p.h+stepH });
        result.push(...this._calculateOthers(p, direction, portlets, step));
        return result;
    }
    _stepWithDirection(direction, step) {
        const sizeDown = direction === Direction.LEFT || direction === Direction.UP;
        const sizeUp = direction === Direction.RIGHT || direction === Direction.DOWN;

        switch(true) {
            case sizeDown: return -Math.abs(step);
            case sizeUp: return Math.abs(step);
            default: err();
        }
    }
    _calculateOthers(p1, direction, portlets, step) {
        const result = [];
        const {filter, map} = this[direction](p1, step, (...v) => result.push(...v));
        
        [...portlets]
            .filter(filter)
            .sort((a, b) => {
                if(!a.hide && b.hide) return -1;
                if(a.hide && !b.hide) return 1;
                if(a.y > b.y) return -1; else return 1;
            })
            .map(map);
        
        return result;
    }
    [Direction.LEFT](p1, step, callback) {
        return {
            filter: p2 => {           
                if(p1.x >= p2.x) return false;

                const collisionVertical = (p1.y <= p2.y && p1.y+p1.h > p2.y) || (p1.y < p2.y+p2.h && p1.y+p1.h >= p2.y+p2.h);
                return collisionVertical;
            },
            map: (p2, i, ps) => {
                if(p2.hide && ps.some(p => !p.hide)) return;
                
                const r = { portlet: p2, x: p2.x+step, y: p2.y, w: p2.w, h: p2.h };
                if(!p2.hide && p2.x === ps[0].x) r.w += -step;
                callback(r);
            }
        };
    }
    [Direction.UP](p1, step, callback) {
        return {
            filter: p2 => {
                if(p1.y >= p2.y) return false;

                const collisionHorizontal = (p1.x <= p2.x && p1.x+p1.x > p2.x) || (p1.x < p2.x+p2.w && p1.x+p1.w >= p2.x+p2.w);
                return collisionHorizontal;
            },
            map: (p2, i, ps) => {
                if(p2.hide && ps.some(p => !p.hide)) return;

                const r = { portlet: p2, x: p2.x, y: p2.y+step, w: p2.w, h: p2.h };
                if(!p2.hide && p2.y === ps[0].y) r.h += -step;
                callback(r);
            }
        };
    }
    [Direction.RIGHT](p1, step, callback) {
        return {
            filter: p2 => {
                if(p1 === p2 || p1.x > p2.x) return false;
                                                
                const collisionHorizontal = p1.x+p1.w+step > p2.x;
                const collisionVertical = (p1.y >= p2.y && p1.y < p2.y+p2.h) || (p2.y >= p1.y && p2.y < p1.y+p1.h);
                return collisionHorizontal && collisionVertical;
            },
            map: (p2, i, ps) => {
                if(p2.hide && ps.some(p => !p.hide)) return;
                
                const r = { portlet: p2, x: p2.x+step, y: p2.y, w: p2.w, h: p2.h };
                if(!p2.hide && p2.x === ps[0].x) r.w += -step;
                callback(r);
                this[Direction.RIGHT](p2, step, callback);
            }
        };
    }
    [Direction.DOWN](p1, step, callback) {
        return {
            filter: p2 => {
                if(p1 === p2 || p1.y > p2.y) return false;

                const collisionHorizontal = (p1.x >= p2.x && p1.x < p2.x+p2.w) || (p2.x >= p1.x && p2.x < p1.x+p1.w);
                const collisionVertical = p1.y+p1.h+step > p2.y;
                return collisionHorizontal && collisionVertical;
            },
            map: (p2, i, ps) => {
                if(p2.hide && ps.some(p => !p.hide)) return;

                const r = { portlet: p2, x: p2.x, y: p2.y+step, w: p2.w, h: p2.h };
                if(!p2.hide && p2.y === ps[0].y) r.h += -step;
                callback(r);
                this[Direction.DOWN](p2, step, callback);
            }
        };
    }
};

const AnimationSelector = class {
    get(type) {
        switch(type) {
            case AnimationSelector.type.TARGET: return new Animation();
            case AnimationSelector.type.OTHER:  return new Animation();
            default: err();
        }
    }
};
AnimationSelector.type = { TARGET: Symbol(), OTHER: Symbol() };

const Animation = class {
    constructor(duration = 500, timing = Animation.quad) {
        prop(this, { duration, timing });
    }
    copy() {
        return new Animation(this.duration, this.timing);
    }    
    start(dom, x, y, w, h) {
        prop(this, { dom, _goalX : x, _goalY : y, _goalW : w, _goalH : h });
        
        this._startX = parseFloat(dom.style.left);
        this._startY = parseFloat(dom.style.top);
        this._startW = parseFloat(dom.style.width);
        this._startH = parseFloat(dom.style.height);
        this._diffX = round2(this._goalX - this._startX);
        this._diffY = round2(this._goalY - this._startY);
        this._diffW = round2(this._goalW - this._startW);
        this._diffH = round2(this._goalH - this._startH);

        requestAnimationFrame(this._animate.bind(this));
    }
    _animate(time) {
        if(!this._startTime) this._startTime = time;
        let timeFraction = (time - this._startTime) / this.duration;
        if(timeFraction > 1) timeFraction = 1;

        const completed = timeFraction === 1;
        const progress = this.timing(timeFraction);

        this._subAnimate(this._startX, this._goalX, this._diffX, progress, 'left', completed);
        this._subAnimate(this._startY, this._goalY, this._diffY, progress, 'top', completed);
        this._subAnimate(this._startW, this._goalW, this._diffW, progress, 'width', completed);
        this._subAnimate(this._startH, this._goalH, this._diffH, progress, 'height', completed);

        if(!completed) requestAnimationFrame(this._animate.bind(this));
    }
    _subAnimate(start, goal, diff, progress, styleProp, completed) {
        if(diff !== 0) {
            const newValue = round2(start + (diff * progress));
            
            if(completed)
                this.dom.style[styleProp] = `${goal}px`;
            else
                this.dom.style[styleProp] = `${newValue}px`;                
        }
    }
}
Animation.linear = timeFraction => {
  return timeFraction;
};
Animation.quad = timeFraction => {
  return Math.pow(timeFraction, 2)
};

const Renderer = class {
    render(portlet, animation) {
        const p = portlet;
        if(!p.dom.style.cssText && !p.dom.classList.contains('portland:custom')) p.dom.style.cssText = Portlet.cssText;

        p.dom.style.position = 'absolute';
        p.dom.style.boxSizing = 'border-box';
        p.dom.style.overflow = 'hidden';

        const {unitW, unitH, margin} = p.parent;
        const x = round2(p.x*unitW + (p.x === 0 ? margin : 0));
        const y = round2(p.y*unitH + (p.y === 0 ? margin : 0));
        const w = !p.w ? 0 : round2(p.w*unitW - (p.x === 0 ? margin*2 : margin));
        const h = !p.h ? 0 : round2(p.h*unitH - (p.y === 0 ? margin*2 : margin));
        
        if(animation)
            animation.start(p.dom, x, y, w, h);
        else {
            p.dom.style.left   = `${x}px`;
            p.dom.style.top    = `${y}px`;
            p.dom.style.width  = `${w}px`;
            p.dom.style.height = `${h}px`;
        }

        p.updateUnit(w, h);
        p.children.forEach(c => this.render(c, animation.copy()));
    }
};

const Portlet = class {
    constructor(x, y, w, h, dom) {
        prop(this, { x, y, w, h, dom });        
        this.children = [];
        this.divideN = Portlet.divideN;
        this.margin = Portlet.margin;
        this.updateUnit(dom.style.width||window.innerWidth, dom.style.height||window.innerHeight);
    }
    location(x, y) {
        this.x = x;
        this.y = y;
    }
    size(w, h) {
        this.w = w;
        this.h = h;
    }
    append(p) {
        this.children.push(p);
        p.parent = this;
    }
    updateUnit(width, height) {
        this.unitW = round2(width / this.divideN);
        this.unitH = round2(height / this.divideN);
    }
};
Portlet.divideN = 10;
Portlet.margin = 4;
Portlet.cssText = `
    background: #fff;
    border-radius: 3px 3px 0 0;
    box-shadow: 0 10px 6px -6px #777;
`;

return {
    HORIOZNTAL, VERTICAL,
    start(portlandId, options) {
        if(!portlandId) err('invald portlandId');

        if(options && options.divideN) Portlet.divideN = options.divideN;
        if(options && options.margin) Portlet.margin = options.margin;
        if(options && options.cssText) Portlet.cssText = options.cssText;
        
        const pc = new PortletController(new KeyboardInputInterpreter(), new PortlandManager());
        pc.initialize(portlandId);
        
        return aop(pc, /^(initialize)$|^_+/, target => target._checkInitialized());
    }
};

})();
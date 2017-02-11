app.SVGRenderer = class extends app.Renderer {
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        super();
        this._element = this._createSVG('svg');
        this._scale = 1;
        this._offset = new g.Vec(0, 0);
        this._layout = null;
        this._isDirty = false;
        this.setSize(width, height);
    }

    _createSVG(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }

    /**
     * @override
     * @return {!Element}
     */
    element() {
        return this._element;
    }

    /**
     * @override
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        if (g.eq(width, this._width) && g.eq(height, this._height))
            return;
        this._width = width;
        this._height = height;
        this._element.setAttribute('width', width + 'px');
        this._element.setAttribute('height', height + 'px');
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {{width: number, height: number}}
     */
    size() {
        return {width: this._width, height: this._height};
    }

    /**
     * @param {number} scale
     */
    setScale(scale) {
        this._scale = scale;
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {number}
     */
    scale() {
        return this._scale;
    }

    /**
     * @override
     * @param {!g.Vec} offset
     */
    setOffset(offset) {
        this._offset = offset;
        this._setTransformAttribute();
    }

    /**
     * @override
     * @return {!g.Vec}
     */
    offset() {
        return this._offset;
    }

    _setTransformAttribute() {
        if (!this._container)
            return;
        var value = 'translate(' + (this._width/2) + ', ' + (this._height/2) + ') ';
        value += 'translate(' + this._offset.x + ', ' + this._offset.y + ') ';
        value += 'scale(' + this._scale + ', ' + this._scale + ') ';
        this._container.setAttribute('transform', value);
    }

    /**
     * @param {!app.Layout} layout
     */
    setLayout(layout) {
        if (this._layout === layout)
            return;
        this._layout = layout;
        this._isDirty = true;
    }

    /**
     * @override
     */
    render() {
        if (!this._isDirty)
            return;
        this._isDirty = false;
        if (this._container)
            this._container.remove();
        this._container = this._createSVG('g');
        this._container.setAttribute('style', 'pointer-events: none');
        this._element.appendChild(this._container);
        this._setTransformAttribute();
        if (!this._layout)
            return;

        this._renderScaffolding(this._container, this._layout.scaffolding);

        var radius = this._layout.personRadius;
        for (var person of this._layout.positions.keys()) {
            var position = this._layout.positions.get(person);
            var rotation = this._layout.rotations.get(person);
            var isRoot = person === this._layout.root;
            this._container.appendChild(this._renderPerson(person, position, rotation, radius, isRoot));
        }
    }

    /**
     * @param {!Element} container
     * @param {!app.Layout} layout
     */
    _renderScaffolding(container, scaffolding) {
        var path = '';
        for (var shape of scaffolding) {
            if (shape instanceof g.Line) {
                var line = /** @type {!g.Line} */(shape);
                path += ' M' + line.from.x + ' ' + line.from.y;
                path += ' L ' + line.to.x + ' ' + line.to.y;
            } else if (shape instanceof g.Arc) {
                var arc = /** @type {!g.Arc} */(shape);
                path += ' M' + arc.from.x + ' ' + arc.from.y;
                path += ' A ' + arc.r + ' ' + arc.r;
                var isLargeArc = g.normalizeRad(arc.toAngle - arc.fromAngle) > Math.PI;
                var component = isLargeArc ? ' 1 1' : ' 0 1';
                path += ' 0 ' + component;
                path += ' ' + arc.to.x + ' ' + arc.to.y;
            } else if (shape instanceof g.Bezier) {
                var bezier = /** @type {!g.Bezier} */(shape);
                path += ' M' + bezier.from.x + ' ' + bezier.from.y;
                path += ' Q ' + bezier.cp.x + ' ' + bezier.cp.y + ' ' + bezier.to.x + ' ' + bezier.to.y;
            }
        }

        var element = this._createSVG('path');
        element.setAttribute('d', path);
        element.setAttribute('fill', 'none');
        element.setAttribute('stroke', 'gray');
        container.appendChild(element);
    }

    /**
     * @param {!app.Person} person
     * @return {!Element}
     */
    _renderPerson(person, position, rotation, personRadius, isRoot) {
        rotation = g.normalizeRad(rotation);
        var textOnLeft = rotation > Math.PI / 2 && rotation < 3 * Math.PI / 2;
        if (textOnLeft)
            rotation -= Math.PI;
        rotation = g.radToDeg(rotation);

        var group = this._createSVG('g');
        var transform = 'translate(' + position.x + ', ' + position.y + ') ';
        transform += 'rotate(' + rotation + ')';
        group.setAttribute('transform', transform);
        group.classList.add('person');
        if (person.deceased)
            group.classList.add('deceased');
        if (person.gender === app.Gender.Male)
            group.classList.add('sex-male');
        else if (person.gender === app.Gender.Female)
            group.classList.add('sex-female');
        else
            group.classList.add('sex-other');
        if (person.isChild())
            group.classList.add('infant');
        if (isRoot)
            group.classList.add('root');

        var circle = this._createSVG('circle');
        circle.setAttribute('r', personRadius);
        group.appendChild(circle);

        var fullName = this._createSVG('text');
        fullName.setAttribute('dominant-baseline', 'text-after-edge');
        fullName.classList.add('name');
        fullName.textContent = person.fullName();
        group.appendChild(fullName);

        var dates = this._createSVG('text');
        dates.setAttribute('dominant-baseline', 'text-before-edge');
        dates.classList.add('dates');
        dates.textContent = person.dates();
        group.appendChild(dates);

        var textPadding = 6;
        if (isRoot) {
            fullName.setAttribute('text-anchor', 'middle');
            fullName.setAttribute('x', 0);
            fullName.setAttribute('y', 0);
            dates.setAttribute('text-anchor', 'middle');
            dates.setAttribute('x', 0);
            dates.setAttribute('y', 0);
        } else if (textOnLeft) {
            fullName.setAttribute('x', -personRadius - textPadding);
            fullName.setAttribute('y', 0);
            fullName.setAttribute('text-anchor', 'end');
            dates.setAttribute('x', -personRadius - textPadding);
            dates.setAttribute('y', 0);
            dates.setAttribute('text-anchor', 'end');
        } else {
            fullName.setAttribute('x', personRadius + textPadding);
            fullName.setAttribute('y', 0);
            dates.setAttribute('x', personRadius + textPadding);
            dates.setAttribute('y', 0);
        }
        return group;
    }

    createPersonIcon(size, gender, isChild, isDeceased) {
        var svg = this._createSVG('svg');
        svg.setAttribute('width', size + 2);
        svg.setAttribute('height', size + 2);
        var radius = size / 2;
        var thisYear = new Date().getFullYear();
        var birthYear = isChild ? thisYear : 0;
        var deathYear = isDeceased ? thisYear : null;
        var person = new app.Person('', '', gender, birthYear, deathYear);
        person.deceased = isDeceased;
        svg.appendChild(this._renderPerson(person, new g.Vec(radius+1, radius+1), 0, radius, false));
        return svg;
    }
}
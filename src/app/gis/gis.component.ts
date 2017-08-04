import { Component, OnInit } from '@angular/core';
declare var ol: any;
declare var jsts: any;

@Component({
    selector: 'app-gis',
    templateUrl: './gis.component.html',
    styleUrls: ['./gis.component.css'],
})
export class GisComponent implements OnInit {

    public map: any;
    public inDrawMode: boolean;
    public output: any;
    private draw: any;
    private modify: any;
    private features: any;
    private layer: any;
    private source: any;
    private selectedType: string;
    private measureTooltipElement: any;
    private measureTooltip: any;
    private helpTooltipElement: any;
    private helpTooltip: any;
    private sketch: any;



    constructor() {
        var raster = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'http://localhost:8080/geoserver/grb_basiskaart/wms',
                params: {
                    'FORMAT': 'image/png',
                    'VERSION': '1.1.1',
                    TILED: true,
                    TRANSPARENT: false,
                    LAYERS: 'grb_basiskaart:GRB_BSK',
                    srs: 'EPSG:31370'
                }
            }),
            name: 'GRB_BSK'
        });

        this.map = new ol.Map({
            layers: [raster],
            view: new ol.View({
                center: ol.proj.transform([4.04, 50.94], 'EPSG:4326', 'EPSG:3857'),
                zoom: 14
            })
        });

        this.features = new ol.Collection();
        this.source = new ol.source.Vector({ features: this.features });
        this.layer = new ol.layer.Vector({
            source: this.source
        });

        this.layer.setMap(this.map);

    }

    setType(type: string): void {
        this.selectedType = type;
        switch (type) {
            case 'Modify':
                this.removeInteractions(true);
                this.modifyMode();

                break;
            case 'Polygon':
                this.removeInteractions(true);
                this.addInteraction();
                break;
            case 'BufferZone': //Bufferzone
                this.removeInteractions(true);
                this.selectedType = 'LineString';
                this.createBufferZone();
                break;
            case 'MeasureLength':
                this.removeInteractions(true);
                this.selectedType = 'LineString';
                this.addMeasureInteraction();
                break;
            case 'MeasureArea':
                this.removeInteractions(true);
                this.selectedType = 'Polygon';
                this.addMeasureInteraction();
                break;
            case 'Delete':
                this.removeInteractions(false);
                this.deleteLayers();
                break;
            default:
                this.removeInteractions(false);

        }
    }
    deleteLayers() {
        this.map.removeInteraction()
        this.layer.setMap(null);
        this.layer.getSource().clear();
        this.helpTooltipElement = null;
        this.measureTooltipElement = null;

        //remove measures
        var staticTooltips = document.getElementsByClassName("tooltip-static");

        for (var i = 0; i < staticTooltips.length; i++) {
            var staticTooltip = staticTooltips[i];
            staticTooltip.parentNode.removeChild(staticTooltip);
        }

        this.output = null;
    }
    removeInteractions(inDrawMode: boolean): void {
        this.inDrawMode = inDrawMode;
        this.map.removeInteraction(this.modify)
        this.map.removeInteraction(this.draw);
        this.map.getViewport().removeEventListener('mouseout', () => { });
        this.helpTooltipElement = null;
        this.measureTooltipElement = null;
    }
    modifyMode() {
        this.modify = new ol.interaction.Modify({
            features: this.features
        });
        this.map.addInteraction(this.modify);
    }
    addInteraction(): void {

        this.createSource();
        this.draw = new ol.interaction.Draw({
            features: this.features,
            type: (this.selectedType)
        });
        this.map.addInteraction(this.draw);
    }


    //Measure methods
    formatArea(polygon: any): number {
        var area = polygon.getArea();
        var output;
        if (area > 10000) {
            output = (Math.round(area / 1000000 * 100) / 100) +
                ' ' + 'km<sup>2</sup>';
        } else {
            output = (Math.round(area * 100) / 100) +
                ' ' + 'm<sup>2</sup>';
        }
        return output;
    }
    formatLength(line: any): number {
        var length = Math.round(line.getLength() * 100) / 100;

        var output;
        if (length > 100) {
            output = (Math.round(length / 1000 * 100) / 100) +
                ' ' + 'km';
        } else {
            output = (Math.round(length * 100) / 100) +
                ' ' + 'm';
        }
        return output;
    }
    createHelpTooltip(): void {
        if (this.helpTooltipElement) {
            this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
        }
        this.helpTooltipElement = document.createElement('div');
        this.helpTooltipElement.className = 'tooltip hidden';
        this.helpTooltip = new ol.Overlay({
            element: this.helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left'
        });
        this.map.addOverlay(this.helpTooltip);
    }
    createMeasureTooltip(): void {
        if (this.measureTooltipElement) {
            this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
        }
        this.measureTooltipElement = document.createElement('div');
        this.measureTooltipElement.className = 'tooltip tooltip-measure';
        this.measureTooltip = new ol.Overlay({
            element: this.measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center'
        });

        this.map.addOverlay(this.measureTooltip);
    }
    addMeasureInteraction(): void {
        this.addInteraction();

        var listener;
        this.createMeasureTooltip();
        this.createHelpTooltip();

        this.draw.on('drawstart', (evt) => {
            // set sketch
            this.sketch = evt.feature;

            /** @type {ol.Coordinate|undefined} */
            var tooltipCoord = evt.coordinate;

            listener = this.sketch.getGeometry().on('change', (evt) => {
                var geom = evt.target;
                var innerOutput;
                if (geom instanceof ol.geom.Polygon) {
                    innerOutput = this.formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof ol.geom.LineString) {
                    innerOutput = this.formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }
                this.measureTooltipElement.innerHTML = innerOutput;
                this.measureTooltip.setPosition(tooltipCoord);
            }, this);
        }, this);

        this.draw.on('drawend', () => {
            this.measureTooltipElement.className = 'tooltip tooltip-static';
            this.measureTooltip.setOffset([0, -7]);
            // unset sketch
            this.sketch = null;
            //unset tooltip so that a new one can be created
            this.measureTooltipElement = null;
            this.createMeasureTooltip();

            ol.Observable.unByKey(listener);
            ol.Observable.unByKey(pointermove);
            this.map.getViewport().removeEventListener('mouseout', () => { });
        }, this);

        var pointermove = this.map.on('pointermove', this.pointerMoveHandler.bind(this));
        var viewportEvent = this.map.getViewport().addEventListener('mouseout', () => {
            this.helpTooltipElement.classList.add('hidden');
        });
    }
    pointerMoveHandler(evt: any): void {
        var continueLineMsg: string = 'Click to continue drawing the line';
        var continuePolygonMsg: string = 'Click to continue drawing the polygon';
        if (evt.dragging) {
            return;
        }
        /** @type {string} */
        var helpMsg = 'Click to start drawing';

        if (this.sketch) {
            var geom = (this.sketch.getGeometry());
            if (geom instanceof ol.geom.Polygon) {
                helpMsg = continuePolygonMsg;
            } else if (geom instanceof ol.geom.LineString) {
                helpMsg = continueLineMsg;
            }
        }

        this.helpTooltipElement.innerHTML = helpMsg;
        this.helpTooltip.setPosition(evt.coordinate);

        this.helpTooltipElement.classList.remove('hidden');
    }

    //Buffer methodd
    createBufferZone() {

        this.addInteraction();
        var listener;
        var inneroutput;

        this.draw.on('drawend', (evt) => {
            this.calculateBuffer(evt.feature);
        }, this);


    }
    calculateBuffer(feature: any): void {

        var parser = new jsts.io.OL3Parser();
        var jstsGeom = parser.read(feature.getGeometry());

        // create a buffer of 40 meters around each line
        var buffered = jstsGeom.buffer(400000);

        // convert back from JSTS and replace the geometry on the feature
        feature.setGeometry(parser.write(buffered));
        this.createSource()
    }
    createSource(): void {
        this.layer.getSource().clear();

        this.source = new ol.source.Vector({ features: this.features });

        this.layer = new ol.layer.Vector({
            source: this.source
        });

        this.layer.setMap(this.map);
    }

    //Feature methods
    setFeature() {
        this.source.on('addfeature', (evt) => {
            var feature = evt.feature;
            var coords = feature.getGeometry().getCoordinates();
            this.output = coords;
        });

    }
    unSetFeature() {
        this.source.un('addfeature', (evt) => {
            console.log('Unregistered from addfeature');
        });
    }
    ngOnInit() {
        this.map.setTarget('map');
        this.setFeature();
    }
}

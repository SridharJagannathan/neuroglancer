/**
 * @license
 * Copyright 2018 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './annotation_tool_status.css';

import {SelectedLayerState} from 'neuroglancer/layer';
import {Tool, ToolBinder} from 'neuroglancer/ui/tool';
import {animationFrameDebounce} from 'neuroglancer/util/animation_frame_debounce';
import {RefCounted} from 'neuroglancer/util/disposable';
import {removeChildren} from 'neuroglancer/util/dom';
import {defaultStringCompare} from 'neuroglancer/util/string';

export class AnnotationToolStatusWidget extends RefCounted {
  element = document.createElement('div');
  private unbindPreviousLayer: (() => void)|undefined;

  get selectedTool(): Tool|undefined {
    const layer = this.selectedLayer.layer;
    if (layer === undefined) {
      return undefined;
    }
    const userLayer = layer.layer;
    if (userLayer === null) {
      return undefined;
    }
    return userLayer.tool.value;
  }

  constructor(public selectedLayer: SelectedLayerState, public toolBinder: ToolBinder) {
    super();
    const {element} = this;
    element.className = 'neuroglancer-annotation-tool-status';
    this.registerDisposer(selectedLayer.changed.add(() => this.selectedLayerChanged()));
    this.registerDisposer(toolBinder.changed.add(this.updateView));
    this.registerDisposer(this.selectedLayer.layerManager.layersChanged.add(this.updateView));
    this.selectedLayerChanged();
  }

  private selectedLayerChanged() {
    let {unbindPreviousLayer} = this;
    if (unbindPreviousLayer !== undefined) {
      unbindPreviousLayer();
    }
    const layer = this.selectedLayer.layer;
    if (layer !== undefined) {
      this.unbindPreviousLayer = layer.specificationChanged.add(() => {
        this.updateView();
      });
    }
    this.updateView();
  }

  disposed() {
    const {unbindPreviousLayer} = this;
    if (unbindPreviousLayer !== undefined) {
      unbindPreviousLayer();
    }
    this.unbindPreviousLayer = undefined;
  }

  private makeWidget(key: string|undefined, tool: Tool): HTMLElement {
    const element = document.createElement('div');
    element.title = 'dblclick → unbind';
    element.className = 'neuroglancer-annotation-tool-status-widget';
    const layerNumberElement = document.createElement('div');
    layerNumberElement.className = 'neuroglancer-annotation-tool-status-widget-layer-number';
    const {managedLayer} = tool.layer;
    const index = managedLayer.manager.rootLayers.managedLayers.indexOf(managedLayer);
    layerNumberElement.textContent = (index + 1).toString();
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'neuroglancer-annotation-tool-status-widget-description';
    descriptionElement.textContent = tool.description;
    element.addEventListener('dblclick', () => {
      if (key === undefined) {
        tool.layer.tool.value = undefined;
      } else {
        this.toolBinder.set(key, undefined);
      }
    });
    if (key !== undefined) {
      const keyElement = document.createElement('div');
      keyElement.className = 'neuroglancer-annotation-tool-status-widget-key';
      keyElement.textContent = key;
      element.appendChild(keyElement);
    }
    element.appendChild(layerNumberElement);
    element.appendChild(descriptionElement);
    return element;
  }

  private updateView = this.registerCancellable(animationFrameDebounce(() => {
    removeChildren(this.element);
    const {selectedTool} = this;
    if (selectedTool !== undefined) {
      this.element.appendChild(this.makeWidget(undefined, selectedTool));
    }
    const bindings = Array.from(this.toolBinder.bindings);
    bindings.sort(([a], [b]) => defaultStringCompare(a,b));
    for (const [key, tool] of bindings) {
      this.element.appendChild(this.makeWidget(key, tool));
    }
  }));
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Services } from './types';
import { declaredViewContainer, renderNode, visitRootRenderNodes } from './util';
export function attachEmbeddedView(parentView, elementData, viewIndex, view) {
    var embeddedViews = elementData.viewContainer._embeddedViews;
    if (viewIndex === null || viewIndex === undefined) {
        viewIndex = embeddedViews.length;
    }
    view.viewContainerParent = parentView;
    addToArray(embeddedViews, viewIndex, view);
    attachProjectedView(elementData, view);
    Services.dirtyParentQueries(view);
    var prevView = viewIndex > 0 ? embeddedViews[viewIndex - 1] : null;
    renderAttachEmbeddedView(elementData, prevView, view);
}
function attachProjectedView(vcElementData, view) {
    var dvcElementData = declaredViewContainer(view);
    if (!dvcElementData || dvcElementData === vcElementData ||
        view.state & 16 /* IsProjectedView */) {
        return;
    }
    // Note: For performance reasons, we
    // - add a view to template._projectedViews only 1x throughout its lifetime,
    //   and remove it not until the view is destroyed.
    //   (hard, as when a parent view is attached/detached we would need to attach/detach all
    //    nested projected views as well, even across component boundaries).
    // - don't track the insertion order of views in the projected views array
    //   (hard, as when the views of the same template are inserted different view containers)
    view.state |= 16 /* IsProjectedView */;
    var projectedViews = dvcElementData.template._projectedViews;
    if (!projectedViews) {
        projectedViews = dvcElementData.template._projectedViews = [];
    }
    projectedViews.push(view);
    // Note: we are changing the NodeDef here as we cannot calculate
    // the fact whether a template is used for projection during compilation.
    markNodeAsProjectedTemplate(view.parent.def, view.parentNodeDef);
}
function markNodeAsProjectedTemplate(viewDef, nodeDef) {
    if (nodeDef.flags & 4 /* ProjectedTemplate */) {
        return;
    }
    viewDef.nodeFlags |= 4 /* ProjectedTemplate */;
    nodeDef.flags |= 4 /* ProjectedTemplate */;
    var parentNodeDef = nodeDef.parent;
    while (parentNodeDef) {
        parentNodeDef.childFlags |= 4 /* ProjectedTemplate */;
        parentNodeDef = parentNodeDef.parent;
    }
}
export function detachEmbeddedView(elementData, viewIndex) {
    var embeddedViews = elementData.viewContainer._embeddedViews;
    if (viewIndex == null || viewIndex >= embeddedViews.length) {
        viewIndex = embeddedViews.length - 1;
    }
    if (viewIndex < 0) {
        return null;
    }
    var view = embeddedViews[viewIndex];
    view.viewContainerParent = null;
    removeFromArray(embeddedViews, viewIndex);
    // See attachProjectedView for why we don't update projectedViews here.
    Services.dirtyParentQueries(view);
    renderDetachView(view);
    return view;
}
export function detachProjectedView(view) {
    if (!(view.state & 16 /* IsProjectedView */)) {
        return;
    }
    var dvcElementData = declaredViewContainer(view);
    if (dvcElementData) {
        var projectedViews = dvcElementData.template._projectedViews;
        if (projectedViews) {
            removeFromArray(projectedViews, projectedViews.indexOf(view));
            Services.dirtyParentQueries(view);
        }
    }
}
export function moveEmbeddedView(elementData, oldViewIndex, newViewIndex) {
    var embeddedViews = elementData.viewContainer._embeddedViews;
    var view = embeddedViews[oldViewIndex];
    removeFromArray(embeddedViews, oldViewIndex);
    if (newViewIndex == null) {
        newViewIndex = embeddedViews.length;
    }
    addToArray(embeddedViews, newViewIndex, view);
    // Note: Don't need to change projectedViews as the order in there
    // as always invalid...
    Services.dirtyParentQueries(view);
    renderDetachView(view);
    var prevView = newViewIndex > 0 ? embeddedViews[newViewIndex - 1] : null;
    renderAttachEmbeddedView(elementData, prevView, view);
    return view;
}
function renderAttachEmbeddedView(elementData, prevView, view) {
    var prevRenderNode = prevView ? renderNode(prevView, prevView.def.lastRenderRootNode) :
        elementData.renderElement;
    var parentNode = view.renderer.parentNode(prevRenderNode);
    var nextSibling = view.renderer.nextSibling(prevRenderNode);
    // Note: We can't check if `nextSibling` is present, as on WebWorkers it will always be!
    // However, browsers automatically do `appendChild` when there is no `nextSibling`.
    visitRootRenderNodes(view, 2 /* InsertBefore */, parentNode, nextSibling, undefined);
}
export function renderDetachView(view) {
    visitRootRenderNodes(view, 3 /* RemoveChild */, null, null, undefined);
}
function addToArray(arr, index, value) {
    // perf: array.push is faster than array.splice!
    if (index >= arr.length) {
        arr.push(value);
    }
    else {
        arr.splice(index, 0, value);
    }
}
function removeFromArray(arr, index) {
    // perf: array.pop is faster than array.splice!
    if (index >= arr.length - 1) {
        arr.pop();
    }
    else {
        arr.splice(index, 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19hdHRhY2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy92aWV3L3ZpZXdfYXR0YWNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBa0MsUUFBUSxFQUFzQyxNQUFNLFNBQVMsQ0FBQztBQUN2RyxPQUFPLEVBQW1CLHFCQUFxQixFQUFtQixVQUFVLEVBQUUsb0JBQW9CLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFFbEgsTUFBTSxVQUFVLGtCQUFrQixDQUM5QixVQUFvQixFQUFFLFdBQXdCLEVBQUUsU0FBb0MsRUFDcEYsSUFBYztJQUNoQixJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUMsYUFBZSxDQUFDLGNBQWMsQ0FBQztJQUMvRCxJQUFJLFNBQVMsS0FBSyxJQUFJLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtRQUNqRCxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztLQUNsQztJQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLENBQUM7SUFDdEMsVUFBVSxDQUFDLGFBQWEsRUFBRSxTQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsbUJBQW1CLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXZDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVsQyxJQUFNLFFBQVEsR0FBRyxTQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDekUsd0JBQXdCLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxhQUEwQixFQUFFLElBQWM7SUFDckUsSUFBTSxjQUFjLEdBQUcscUJB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LEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFjO0lBQzdDLG9CQUFvQixDQUFDLElBQUksdUJBQWdDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDbEYsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEdBQVUsRUFBRSxLQUFhLEVBQUUsS0FBVTtJQUN2RCxnREFBZ0Q7SUFDaEQsSUFBSSxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2pCO1NBQU07UUFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDN0I7QUFDSCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBVSxFQUFFLEtBQWE7SUFDaEQsK0NBQStDO0lBQy9DLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN0QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RWxlbWVudERhdGEsIE5vZGVEZWYsIE5vZGVGbGFncywgU2VydmljZXMsIFZpZXdEYXRhLCBWaWV3RGVmaW5pdGlvbiwgVmlld1N0YXRlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7UmVuZGVyTm9kZUFjdGlvbiwgZGVjbGFyZWRWaWV3Q29udGFpbmVyLCBpc0NvbXBvbmVudFZpZXcsIHJlbmRlck5vZGUsIHZpc2l0Um9vdFJlbmRlck5vZGVzfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gYXR0YWNoRW1iZWRkZWRWaWV3KFxuICAgIHBhcmVudFZpZXc6IFZpZXdEYXRhLCBlbGVtZW50RGF0YTogRWxlbWVudERhdGEsIHZpZXdJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkIHwgbnVsbCxcbiAgICB2aWV3OiBWaWV3RGF0YSkge1xuICBsZXQgZW1iZWRkZWRWaWV3cyA9IGVsZW1lbnREYXRhLnZpZXdDb250YWluZXIgIS5fZW1iZWRkZWRWaWV3cztcbiAgaWYgKHZpZXdJbmRleCA9PT0gbnVsbCB8fCB2aWV3SW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgIHZpZXdJbmRleCA9IGVtYmVkZGVkVmlld3MubGVuZ3RoO1xuICB9XG4gIHZpZXcudmlld0NvbnRhaW5lclBhcmVudCA9IHBhcmVudFZpZXc7XG4gIGFkZFRvQXJyYXkoZW1iZWRkZWRWaWV3cywgdmlld0luZGV4ICEsIHZpZXcpO1xuICBhdHRhY2hQcm9qZWN0ZWRWaWV3KGVsZW1lbnREYXRhLCB2aWV3KTtcblxuICBTZXJ2aWNlcy5kaXJ0eVBhcmVudFF1ZXJpZXModmlldyk7XG5cbiAgY29uc3QgcHJldlZpZXcgPSB2aWV3SW5kZXggISA+IDAgPyBlbWJlZGRlZFZpZXdzW3ZpZXdJbmRleCAhIC0gMV0gOiBudWxsO1xuICByZW5kZXJBdHRhY2hFbWJlZGRlZFZpZXcoZWxlbWVudERhdGEsIHByZXZWaWV3LCB2aWV3KTtcbn1cblxuZnVuY3Rpb24gYXR0YWNoUHJvamVjdGVkVmlldyh2Y0VsZW1lbnREYXRhOiBFbGVtZW50RGF0YSwgdmlldzogVmlld0RhdGEpIHtcbiAgY29uc3QgZHZjRWxlbWVudERhdGEgPSBkZWNsYXJlZFZpZXdDb250YWluZXIodmlldyk7XG4gIGlmICghZHZjRWxlbWVudERhdGEgfHwgZHZjRWxlbWVudERhdGEgPT09IHZjRWxlbWVudERhdGEgfHxcbiAgICAgIHZpZXcuc3RhdGUgJiBWaWV3U3RhdGUuSXNQcm9qZWN0ZWRWaWV3KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIE5vdGU6IEZvciBwZXJmb3JtYW5jZSByZWFzb25zLCB3ZVxuICAvLyAtIGFkZCBhIHZpZXcgdG8gdGVtcGxhdGUuX3Byb2plY3RlZFZpZXdzIG9ubHkgMXggdGhyb3VnaG91dCBpdHMgbGlmZXRpbWUsXG4gIC8vICAgYW5kIHJlbW92ZSBpdCBub3QgdW50aWwgdGhlIHZpZXcgaXMgZGVzdHJveWVkLlxuICAvLyAgIChoYXJkLCBhcyB3aGVuIGEgcGFyZW50IHZpZXcgaXMgYXR0YWNoZWQvZGV0YWNoZWQgd2Ugd291bGQgbmVlZCB0byBhdHRhY2gvZGV0YWNoIGFsbFxuICAvLyAgICBuZXN0ZWQgcHJvamVjdGVkIHZpZXdzIGFzIHdlbGwsIGV2ZW4gYWNyb3NzIGNvbXBvbmVudCBib3VuZGFyaWVzKS5cbiAgLy8gLSBkb24ndCB0cmFjayB0aGUgaW5zZXJ0aW9uIG9yZGVyIG9mIHZpZXdzIGluIHRoZSBwcm9qZWN0ZWQgdmlld3MgYXJyYXlcbiAgLy8gICAoaGFyZCwgYXMgd2hlbiB0aGUgdmlld3Mgb2YgdGhlIHNhbWUgdGVtcGxhdGUgYXJlIGluc2VydGVkIGRpZmZlcmVudCB2aWV3IGNvbnRhaW5lcnMpXG4gIHZpZXcuc3RhdGUgfD0gVmlld1N0YXRlLklzUHJvamVjdGVkVmlldztcbiAgbGV0IHByb2plY3RlZFZpZXdzID0gZHZjRWxlbWVudERhdGEudGVtcGxhdGUuX3Byb2plY3RlZFZpZXdzO1xuICBpZiAoIXByb2plY3RlZFZpZXdzKSB7XG4gICAgcHJvamVjdGVkVmlld3MgPSBkdmNFbGVtZW50RGF0YS50ZW1wbGF0ZS5fcHJvamVjdGVkVmlld3MgPSBbXTtcbiAgfVxuICBwcm9qZWN0ZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAvLyBOb3RlOiB3ZSBhcmUgY2hhbmdpbmcgdGhlIE5vZGVEZWYgaGVyZSBhcyB3ZSBjYW5ub3QgY2FsY3VsYXRlXG4gIC8vIHRoZSBmYWN0IHdoZXRoZXIgYSB0ZW1wbGF0ZSBpcyB1c2VkIGZvciBwcm9qZWN0aW9uIGR1cmluZyBjb21waWxhdGlvbi5cbiAgbWFya05vZGVBc1Byb2plY3RlZFRlbXBsYXRlKHZpZXcucGFyZW50ICEuZGVmLCB2aWV3LnBhcmVudE5vZGVEZWYgISk7XG59XG5cbmZ1bmN0aW9uIG1hcmtOb2RlQXNQcm9qZWN0ZWRUZW1wbGF0ZSh2aWV3RGVmOiBWaWV3RGVmaW5pdGlvbiwgbm9kZURlZjogTm9kZURlZikge1xuICBpZiAobm9kZURlZi5mbGFncyAmIE5vZGVGbGFncy5Qcm9qZWN0ZWRUZW1wbGF0ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2aWV3RGVmLm5vZGVGbGFncyB8PSBOb2RlRmxhZ3MuUHJvamVjdGVkVGVtcGxhdGU7XG4gIG5vZGVEZWYuZmxhZ3MgfD0gTm9kZUZsYWdzLlByb2plY3RlZFRlbXBsYXRlO1xuICBsZXQgcGFyZW50Tm9kZURlZiA9IG5vZGVEZWYucGFyZW50O1xuICB3aGlsZSAocGFyZW50Tm9kZURlZikge1xuICAgIHBhcmVudE5vZGVEZWYuY2hpbGRGbGFncyB8PSBOb2RlRmxhZ3MuUHJvamVjdGVkVGVtcGxhdGU7XG4gICAgcGFyZW50Tm9kZURlZiA9IHBhcmVudE5vZGVEZWYucGFyZW50O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRhY2hFbWJlZGRlZFZpZXcoZWxlbWVudERhdGE6IEVsZW1lbnREYXRhLCB2aWV3SW5kZXg/OiBudW1iZXIpOiBWaWV3RGF0YXxudWxsIHtcbiAgY29uc3QgZW1iZWRkZWRWaWV3cyA9IGVsZW1lbnREYXRhLnZpZXdDb250YWluZXIgIS5fZW1iZWRkZWRWaWV3cztcbiAgaWYgKHZpZXdJbmRleCA9PSBudWxsIHx8IHZpZXdJbmRleCA+PSBlbWJlZGRlZFZpZXdzLmxlbmd0aCkge1xuICAgIHZpZXdJbmRleCA9IGVtYmVkZGVkVmlld3MubGVuZ3RoIC0gMTtcbiAgfVxuICBpZiAodmlld0luZGV4IDwgMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHZpZXcgPSBlbWJlZGRlZFZpZXdzW3ZpZXdJbmRleF07XG4gIHZpZXcudmlld0NvbnRhaW5lclBhcmVudCA9IG51bGw7XG4gIHJlbW92ZUZyb21BcnJheShlbWJlZGRlZFZpZXdzLCB2aWV3SW5kZXgpO1xuXG4gIC8vIFNlZSBhdHRhY2hQcm9qZWN0ZWRWaWV3IGZvciB3aHkgd2UgZG9uJ3QgdXBkYXRlIHByb2plY3RlZFZpZXdzIGhlcmUuXG4gIFNlcnZpY2VzLmRpcnR5UGFyZW50UXVlcmllcyh2aWV3KTtcblxuICByZW5kZXJEZXRhY2hWaWV3KHZpZXcpO1xuXG4gIHJldHVybiB2aWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0YWNoUHJvamVjdGVkVmlldyh2aWV3OiBWaWV3RGF0YSkge1xuICBpZiAoISh2aWV3LnN0YXRlICYgVmlld1N0YXRlLklzUHJvamVjdGVkVmlldykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgZHZjRWxlbWVudERhdGEgPSBkZWNsYXJlZFZpZXdDb250YWluZXIodmlldyk7XG4gIGlmIChkdmNFbGVtZW50RGF0YSkge1xuICAgIGNvbnN0IHByb2plY3RlZFZpZXdzID0gZHZjRWxlbWVudERhdGEudGVtcGxhdGUuX3Byb2plY3RlZFZpZXdzO1xuICAgIGlmIChwcm9qZWN0ZWRWaWV3cykge1xuICAgICAgcmVtb3ZlRnJvbUFycmF5KHByb2plY3RlZFZpZXdzLCBwcm9qZWN0ZWRWaWV3cy5pbmRleE9mKHZpZXcpKTtcbiAgICAgIFNlcnZpY2VzLmRpcnR5UGFyZW50UXVlcmllcyh2aWV3KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmVFbWJlZGRlZFZpZXcoXG4gICAgZWxlbWVudERhdGE6IEVsZW1lbnREYXRhLCBvbGRWaWV3SW5kZXg6IG51bWJlciwgbmV3Vmlld0luZGV4OiBudW1iZXIpOiBWaWV3RGF0YSB7XG4gIGNvbnN0IGVtYmVkZGVkVmlld3MgPSBlbGVtZW50RGF0YS52aWV3Q29udGFpbmVyICEuX2VtYmVkZGVkVmlld3M7XG4gIGNvbnN0IHZpZXcgPSBlbWJlZGRlZFZpZXdzW29sZFZpZXdJbmRleF07XG4gIHJlbW92ZUZyb21BcnJheShlbWJlZGRlZFZpZXdzLCBvbGRWaWV3SW5kZXgpO1xuICBpZiAobmV3Vmlld0luZGV4ID09IG51bGwpIHtcbiAgICBuZXdWaWV3SW5kZXggPSBlbWJlZGRlZFZpZXdzLmxlbmd0aDtcbiAgfVxuICBhZGRUb0FycmF5KGVtYmVkZGVkVmlld3MsIG5ld1ZpZXdJbmRleCwgdmlldyk7XG5cbiAgLy8gTm90ZTogRG9uJ3QgbmVlZCB0byBjaGFuZ2UgcHJvamVjdGVkVmlld3MgYXMgdGhlIG9yZGVyIGluIHRoZXJlXG4gIC8vIGFzIGFsd2F5cyBpbnZhbGlkLi4uXG5cbiAgU2VydmljZXMuZGlydHlQYXJlbnRRdWVyaWVzKHZpZXcpO1xuXG4gIHJlbmRlckRldGFjaFZpZXcodmlldyk7XG4gIGNvbnN0IHByZXZWaWV3ID0gbmV3Vmlld0luZGV4ID4gMCA/IGVtYmVkZGVkVmlld3NbbmV3Vmlld0luZGV4IC0gMV0gOiBudWxsO1xuICByZW5kZXJBdHRhY2hFbWJlZGRlZFZpZXcoZWxlbWVudERhdGEsIHByZXZWaWV3LCB2aWV3KTtcblxuICByZXR1cm4gdmlldztcbn1cblxuZnVuY3Rpb24gcmVuZGVyQXR0YWNoRW1iZWRkZWRWaWV3KFxuICAgIGVsZW1lbnREYXRhOiBFbGVtZW50RGF0YSwgcHJldlZpZXc6IFZpZXdEYXRhIHwgbnVsbCwgdmlldzogVmlld0RhdGEpIHtcbiAgY29uc3QgcHJldlJlbmRlck5vZGUgPSBwcmV2VmlldyA/IHJlbmRlck5vZGUocHJldlZpZXcsIHByZXZWaWV3LmRlZi5sYXN0UmVuZGVyUm9vdE5vZGUgISkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudERhdGEucmVuZGVyRWxlbWVudDtcbiAgY29uc3QgcGFyZW50Tm9kZSA9IHZpZXcucmVuZGVyZXIucGFyZW50Tm9kZShwcmV2UmVuZGVyTm9kZSk7XG4gIGNvbnN0IG5leHRTaWJsaW5nID0gdmlldy5yZW5kZXJlci5uZXh0U2libGluZyhwcmV2UmVuZGVyTm9kZSk7XG4gIC8vIE5vdGU6IFdlIGNhbid0IGNoZWNrIGlmIGBuZXh0U2libGluZ2AgaXMgcHJlc2VudCwgYXMgb24gV2ViV29ya2VycyBpdCB3aWxsIGFsd2F5cyBiZSFcbiAgLy8gSG93ZXZlciwgYnJvd3NlcnMgYXV0b21hdGljYWxseSBkbyBgYXBwZW5kQ2hpbGRgIHdoZW4gdGhlcmUgaXMgbm8gYG5leHRTaWJsaW5nYC5cbiAgdmlzaXRSb290UmVuZGVyTm9kZXModmlldywgUmVuZGVyTm9kZUFjdGlvbi5JbnNlcnRCZWZvcmUsIHBhcmVudE5vZGUsIG5leHRTaWJsaW5nLCB1bmRlZmluZWQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGV0YWNoVmlldyh2aWV3OiBWaWV3RGF0YSkge1xuICB2aXNpdFJvb3RSZW5kZXJOb2Rlcyh2aWV3LCBSZW5kZXJOb2RlQWN0aW9uLlJlbW92ZUNoaWxkLCBudWxsLCBudWxsLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBhZGRUb0FycmF5KGFycjogYW55W10sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpIHtcbiAgLy8gcGVyZjogYXJyYXkucHVzaCBpcyBmYXN0ZXIgdGhhbiBhcnJheS5zcGxpY2UhXG4gIGlmIChpbmRleCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgYXJyLnB1c2godmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDAsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVGcm9tQXJyYXkoYXJyOiBhbnlbXSwgaW5kZXg6IG51bWJlcikge1xuICAvLyBwZXJmOiBhcnJheS5wb3AgaXMgZmFzdGVyIHRoYW4gYXJyYXkuc3BsaWNlIVxuICBpZiAoaW5kZXggPj0gYXJyLmxlbmd0aCAtIDEpIHtcbiAgICBhcnIucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn1cbiJdfQ==
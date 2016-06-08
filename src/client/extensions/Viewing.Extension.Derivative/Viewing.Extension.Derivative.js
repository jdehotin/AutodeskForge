/////////////////////////////////////////////////////////////////////
// DerivativeExtension
// by Philippe Leefsma, April 2016
//
/////////////////////////////////////////////////////////////////////
import DerivativePropertyPanel from './Viewing.Extension.Derivative.PropertyPanel'
import DerivativeAPI from './Viewing.Extension.Derivative.API'
import JobPanel from './Viewing.Extension.Derivative.JobPanel'
import ExtensionBase from 'ExtensionBase'

class DerivativeExtension extends ExtensionBase {

  /////////////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////////////
  constructor(viewer, options) {

    super(viewer, options);

    this.api = new DerivativeAPI({
      apiUrl: '/api/derivative'
    })

    this.onAggregateSelectionChangedHandler = (e) => {

      this.onAggregateSelectionChanged(e)
    }
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  onAggregateSelectionChanged(event) {

    if (event.selections && event.selections.length) {

      var selection = event.selections[0]

      this.panel.setModel(selection.model)
    }
    else {

      this.panel.setModel(null)
    }
  }

  /////////////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.Derivative';
  }

  /////////////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////////////
  load() {

    this._viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onAggregateSelectionChangedHandler)

    this.panel = new DerivativePropertyPanel(
      this._viewer, this.api)

    this._viewer.setPropertyPanel(this.panel)

    console.log('Viewing.Extension.Derivative loaded')

    return true
  }

  /////////////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////////////
  unload() {

    this._viewer.removeEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onAggregateSelectionChangedHandler)

    this._viewer.setPropertyPanel(null)

    console.log('Viewing.Extension.Derivative unloaded');

    return true;
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  postJob(version) {

    return new Promise(async(resolve, reject) => {

      var storageUrn = window.btoa(
        version.relationships.storage.data.id)

      console.log('Job: ' + storageUrn)

      var jobPanel = new JobPanel(
        this._viewer.container,
        version)

      try {

        var job = await this.api.postJob({
          fileExtType: version.attributes && version.attributes.extension ?
            version.attributes.extension.type : null,
          rootFilename: version.attributes ? version.attributes.name : null,
          outputType: 'svf',
          urn: storageUrn
        })

        if (job.result === 'success' || job.result === 'created') {

          await this.api.waitJob(storageUrn, (progress) => {

            jobPanel.updateProgress(progress)
          })

          jobPanel.done()

          return resolve(job)
        }
        else {

          jobPanel.jobFailed(job)
          return reject(job)
        }
      }
      catch(ex) {

        jobPanel.jobFailed(ex)
        return reject(ex)
      }
    })
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  deleteManifest(urn) {

    this.api.deleteManifest(urn)
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  DerivativeExtension.ExtensionId,
  DerivativeExtension);
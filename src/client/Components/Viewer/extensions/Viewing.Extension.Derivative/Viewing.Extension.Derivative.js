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

    super(viewer, options)

    this.api = new DerivativeAPI({
      apiUrl: '/api/derivative'
    })
  }

  /////////////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.Derivative'
  }

  /////////////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////////////
  load() {

    this._viewer.addEventListener(
      Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {

        if(!this.panel) {

          this.panel = new DerivativePropertyPanel(
            this._viewer, this.api)

          this._viewer.setPropertyPanel(this.panel)
        }
      })

    console.log('Viewing.Extension.Derivative loaded')

    return true
  }

  /////////////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////////////
  unload() {

    this._viewer.setPropertyPanel(null)

    console.log('Viewing.Extension.Derivative unloaded')

    return true
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  postJob(version) {

    return new Promise(async(resolve, reject) => {

      var storageUrn = window.btoa(
        version.relationships.storage.data.id)

      storageUrn = storageUrn.replace(
        new RegExp('=', 'g'), '')

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

          var manifest = await this.api.waitJob(storageUrn,
            (progress) => {

              return jobPanel.updateProgress(progress)
            })

          jobPanel.done()

          return resolve(manifest)
        }
        else {

          this.deleteManifest(storageUrn)
          jobPanel.jobFailed(job)
          return reject(job)
        }
      }
      catch(ex) {

        this.deleteManifest(storageUrn)
        jobPanel.jobFailed(ex)
        return reject(ex)
      }
    })
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  getManifest(urn) {

    return this.api.getManifest(urn)
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  getMetadata(urn) {

    return this.api.getMetadata(urn)
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  deleteManifest(urn) {

    this.api.deleteManifest(urn)
  }

  /////////////////////////////////////////////////////////////////
  // Item node from DM TreeView
  //
  /////////////////////////////////////////////////////////////////
  async onItemNode(node) {

    try {

      // pick last item version
      if (node.versions && node.versions.length) {

        var version = node.versions[ node.versions.length - 1 ]

        var storageUrn = window.btoa(
          version.relationships.storage.data.id)

        storageUrn = storageUrn.replace(
          new RegExp('=', 'g'), '')

        var manifest = await this.api.getManifest(storageUrn)

        if (manifest &&
          manifest.status === 'success' &&
          manifest.progress === 'complete') {

          version.manifest = manifest

          node.parent.classList.add('derivated')
        }
      }
    }
    catch(ex){

      // file not derivated have no manifest
      // skip those errors
      if(ex !== 'Not Found') {
        console.warn(ex)
      }
    }
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  DerivativeExtension.ExtensionId,
  DerivativeExtension)
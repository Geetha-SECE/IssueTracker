const mongoose = require('mongoose');
const Issue = require('../models/Issue.js');

module.exports = app => {
  app
    .route('/api/issues/:project')
    .post((req, res) => {
      const { project } = req.params;
      const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;

      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }

      const issue = new Issue({
        project,
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || '',
        status_text: status_text || ''
      });

      issue.save((err, saved) => {
        if (err) return res.json({ error: 'could not create issue' });
        res.json(saved);
      });
    })
    .get((req, res) => {
      const { project } = req.params;
      const filter = { project, ...req.query };

      if (filter.open !== undefined) {
        filter.open = filter.open === 'true';
      }

      Issue.find(filter, (err, issues) => {
        if (err) return res.json([]);
        res.json(issues);
      });
    })
    .put((req, res) => {
      const { project } = req.params;
      const { _id, ...updates } = req.body;

      if (!_id) {
        return res.json({ error: 'missing _id' });
      }

      const updateKeys = Object.keys(updates).filter(k => updates[k] !== undefined);
      if (updateKeys.length === 0) {
        return res.json({ error: 'no update field(s) sent', _id });
      }

      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.json({ error: 'could not update', _id });
      }

      updates.updated_on = new Date();

      Issue.findOneAndUpdate(
        { _id, project },
        { $set: updates },
        { new: true },
        (err, doc) => {
          if (err || !doc) return res.json({ error: 'could not update', _id });
          res.json({ result: 'successfully updated', _id });
        }
      );
    })
    .delete((req, res) => {
      const { project } = req.params;
      const { _id } = req.body;

      if (!_id) {
        return res.json({ error: 'missing _id' });
      }

      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.json({ error: 'could not delete', _id });
      }

      Issue.findOneAndDelete({ _id, project }, (err, doc) => {
        if (err || !doc) return res.json({ error: 'could not delete', _id });
        res.json({ result: 'successfully deleted', _id });
      });
    });
};

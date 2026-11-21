const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

process.env.NODE_ENV = 'test';

chai.use(chaiHttp);

const app = require('../server');
const Issue = require('../models/Issue');

const expect = chai.expect;

let mongoServer;
const project = 'testproject';

before(async function () {
  this.timeout(120000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

after(async function () {
  this.timeout(120000);
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Issue.deleteMany({});
});

function createIssue(payload = {}) {
  return chai.request(app).post(`/api/issues/${project}`).send({
    issue_title: 'Test title',
    issue_text: 'Test text',
    created_by: 'tester',
    assigned_to: '',
    status_text: '',
    ...payload
  });
}

describe('Issue Tracker API', function () {
  this.timeout(20000);

  it('1. Create an issue with every field: POST /api/issues/{project}', async () => {
    const res = await chai.request(app)
      .post(`/api/issues/${project}`)
      .send({
        issue_title: 'Title',
        issue_text: 'Text',
        created_by: 'user',
        assigned_to: 'assignee',
        status_text: 'in progress'
      });

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('issue_title', 'Title');
    expect(res.body).to.have.property('issue_text', 'Text');
    expect(res.body).to.have.property('created_by', 'user');
    expect(res.body).to.have.property('assigned_to', 'assignee');
    expect(res.body).to.have.property('status_text', 'in progress');
    expect(res.body).to.have.property('open', true);
    expect(res.body).to.have.property('_id');
    expect(res.body).to.have.property('created_on');
    expect(res.body).to.have.property('updated_on');
  });

  it('2. Create an issue with only required fields: POST /api/issues/{project}', async () => {
    const res = await chai.request(app)
      .post(`/api/issues/${project}`)
      .send({ issue_title: 'Title', issue_text: 'Text', created_by: 'user' });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('issue_title', 'Title');
    expect(res.body).to.have.property('issue_text', 'Text');
    expect(res.body).to.have.property('created_by', 'user');
    expect(res.body).to.have.property('assigned_to', '');
    expect(res.body).to.have.property('status_text', '');
    expect(res.body).to.have.property('open', true);
    expect(res.body).to.have.property('_id');
    expect(res.body).to.have.property('created_on');
    expect(res.body).to.have.property('updated_on');
  });

  it('3. Create an issue with missing required fields: POST /api/issues/{project}', async () => {
    const res = await chai.request(app).post(`/api/issues/${project}`).send({});

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ error: 'required field(s) missing' });
  });

  it('4. View issues on a project: GET /api/issues/{project}', async () => {
    await createIssue({ issue_title: 'One', created_by: 'a' });
    await createIssue({ issue_title: 'Two', created_by: 'b' });

    const res = await chai.request(app).get(`/api/issues/${project}`);

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    res.body.forEach(issue => {
      expect(issue).to.have.property('_id');
      expect(issue).to.have.property('issue_title');
      expect(issue).to.have.property('issue_text');
      expect(issue).to.have.property('created_by');
      expect(issue).to.have.property('assigned_to');
      expect(issue).to.have.property('status_text');
      expect(issue).to.have.property('created_on');
      expect(issue).to.have.property('updated_on');
      expect(issue).to.have.property('open');
    });
  });

  it('5. View issues on a project with one filter: GET /api/issues/{project}?open=false', async () => {
    await createIssue({ open: true });
    const closed = await createIssue({ open: false });
    await createIssue({ open: false });

    const res = await chai.request(app).get(`/api/issues/${project}?open=false`);

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    res.body.forEach(issue => {
      expect(issue.open).to.equal(false);
    });
  });

  it('6. View issues on a project with multiple filters: GET /api/issues/{project}?open=false&created_by=x', async () => {
    await createIssue({ open: false, created_by: 'alice' });
    await createIssue({ open: false, created_by: 'bob' });
    await createIssue({ open: true, created_by: 'alice' });

    const res = await chai.request(app)
      .get(`/api/issues/${project}?open=false&created_by=alice`);

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array').with.lengthOf(1);
    expect(res.body[0].open).to.equal(false);
    expect(res.body[0].created_by).to.equal('alice');
  });

  it('7. Update one field on an issue: PUT /api/issues/{project}', async () => {
    const created = await createIssue({ status_text: 'pending' });

    const res = await chai.request(app)
      .put(`/api/issues/${project}`)
      .send({ _id: created.body._id, status_text: 'resolved' });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      result: 'successfully updated',
      _id: created.body._id
    });
  });

  it('8. Update multiple fields on an issue: PUT /api/issues/{project}', async () => {
    const created = await createIssue({ assigned_to: 'a', status_text: 'pending' });

    const res = await chai.request(app)
      .put(`/api/issues/${project}`)
      .send({ _id: created.body._id, assigned_to: 'b', status_text: 'done', open: false });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      result: 'successfully updated',
      _id: created.body._id
    });
  });

  it('9. Update an issue with missing _id: PUT /api/issues/{project}', async () => {
    const res = await chai.request(app)
      .put(`/api/issues/${project}`)
      .send({ status_text: 'resolved' });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ error: 'missing _id' });
  });

  it('10. Update an issue with no fields to update: PUT /api/issues/{project}', async () => {
    const created = await createIssue();

    const res = await chai.request(app)
      .put(`/api/issues/${project}`)
      .send({ _id: created.body._id });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      error: 'no update field(s) sent',
      _id: created.body._id
    });
  });

  it('11. Update an issue with an invalid _id: PUT /api/issues/{project}', async () => {
    const res = await chai.request(app)
      .put(`/api/issues/${project}`)
      .send({ _id: 'notanobjectid', status_text: 'resolved' });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      error: 'could not update',
      _id: 'notanobjectid'
    });
  });

  it('12. Delete an issue: DELETE /api/issues/{project}', async () => {
    const created = await createIssue();

    const res = await chai.request(app)
      .delete(`/api/issues/${project}`)
      .send({ _id: created.body._id });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      result: 'successfully deleted',
      _id: created.body._id
    });

    const remaining = await chai.request(app).get(`/api/issues/${project}`);
    expect(remaining.body).to.be.an('array').with.lengthOf(0);
  });

  it('13. Delete an issue with an invalid _id: DELETE /api/issues/{project}', async () => {
    const res = await chai.request(app)
      .delete(`/api/issues/${project}`)
      .send({ _id: 'notanobjectid' });

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      error: 'could not delete',
      _id: 'notanobjectid'
    });
  });

  it('14. Delete an issue with missing _id: DELETE /api/issues/{project}', async () => {
    const res = await chai.request(app).delete(`/api/issues/${project}`).send({});

    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ error: 'missing _id' });
  });
});
